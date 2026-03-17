import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Label, LabelDocument } from './label.schema';
import { Note, NoteDocument } from '../notes/note.schema';
import { CreateLabelDto } from './create-label.dto';
import { UpdateLabelDto } from './update-label.dto';

@Injectable()
export class LabelsService implements OnModuleInit {
  constructor(
    @InjectModel(Label.name) private labelModel: Model<LabelDocument>,
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
  ) { }

  async onModuleInit() {
    console.log('[LabelsService] Initializing: ensuring Trash label exists for existing users...');
    try {
      // Find all unique users who have labels
      const users = await this.labelModel.distinct('user').exec();

      for (const user of users) {
        await this.ensureTrashLabelExists(user);
      }
      console.log('[LabelsService] Initialization complete.');
    } catch (error) {
      console.error('[LabelsService] Error during initialization:', error);
    }
  }

  async ensureTrashLabelExists(user: string): Promise<LabelDocument> {
    let trashLabel = await this.labelModel.findOne({ name: 'Trash', user }).exec();
    if (!trashLabel) {
      console.log(`[LabelsService] Creating Trash label for user: ${user}`);
      trashLabel = new this.labelModel({ name: 'Trash', user });
      await trashLabel.save();
    }
    return trashLabel;
  }

  async findAll(user: string): Promise<Label[]> {
    return this.labelModel.find({ user }).exec();
  }

  async create(createLabelDto: CreateLabelDto): Promise<Label> {
    const createdLabel = new this.labelModel(createLabelDto);
    return createdLabel.save();
  }

  async update(id: string, updateLabelDto: UpdateLabelDto): Promise<Label | null> {
    return this.labelModel.findByIdAndUpdate(id, updateLabelDto, { new: true }).exec();
  }

  async delete(id: string): Promise<any> {
    const labelToDelete = await this.labelModel.findById(id).exec();
    if (!labelToDelete) {
      throw new NotFoundException('Label not found');
    }

    const { user, name } = labelToDelete;

    // If deleting Trash itself, just delete it (or handle differently if desired)
    if (name === 'Trash') {
      return this.labelModel.findByIdAndDelete(id).exec();
    }

    // Ensure Trash label exists for this user
    const trashLabel = await this.ensureTrashLabelExists(user);

    console.log(`[LabelsService] Attempting to move notes from label ${id} to Trash ${trashLabel._id} for user ${user}`);

    // Before moving, let's see how many notes exist for this label
    const notesBefore = await this.noteModel.find({
      $or: [{ label: id }, { label: new Types.ObjectId(id) }]
    }).exec();

    console.log(`[LabelsService] Found ${notesBefore.length} notes associated with label ${id} (ignoring user filter for check)`);
    if (notesBefore.length > 0) {
      console.log(`[LabelsService] First note user: ${notesBefore[0].user}, expected user: ${user}`);
    }

    // Move all notes to Trash
    // We try to be as broad as possible to ensure we catch them
    console.log(`[LabelsService] Executing updateMany for label ${id} -> Trash ${trashLabel._id}`);
    const updateResult = await this.noteModel.updateMany(
      {
        $or: [
          { label: id },
          { label: new Types.ObjectId(id) },
          { label: String(id) }
        ]
      },
      { $set: { label: trashLabel._id } }
    ).exec();

    console.log(`[LabelsService] Update result: matchedCount=${updateResult.matchedCount}, modifiedCount=${updateResult.modifiedCount}`);

    if (updateResult.matchedCount > 0) {
      // Find one of the notes to verify its label and user
      const sampleNote = await this.noteModel.findOne({ label: trashLabel._id }).exec();
      if (sampleNote) {
        console.log(`[LabelsService] VERIFICATION SUCCESS: Note ${sampleNote._id} is now linked to Trash label ${sampleNote.label}`);
        console.log(`[LabelsService] Note content: title="${sampleNote.title}", user="${sampleNote.user}"`);
      } else {
        console.warn(`[LabelsService] VERIFICATION FAILED: Could not find any notes with label ${trashLabel._id} after update!`);
      }
    }

    console.log(`[LabelsService] Finally deleting label ${id}`);
    return this.labelModel.findByIdAndDelete(id).exec();
  }

  async deleteNote(id: string): Promise<any> {
    const note = await this.noteModel.findById(id).exec();
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const { user, label } = note;

    // Ensure a Trash label exists for this user
    const trashLabel = await this.ensureTrashLabelExists(user);

    // Check if the note is already in the Trash
    const isAlreadyInTrash = label && (String(label) === String(trashLabel._id));

    if (isAlreadyInTrash) {
      console.log(`[LabelsService] Note ${id} is already in Trash. Deleting permanently.`);
      return this.noteModel.findByIdAndDelete(id).exec();
    } else {
      console.log(`[LabelsService] Note ${id} is not in Trash. Moving to Trash ${trashLabel._id}.`);
      return this.noteModel.findByIdAndUpdate(
        id,
        { $set: { label: trashLabel._id } },
        { new: true }
      ).exec();
    }
  }
}

