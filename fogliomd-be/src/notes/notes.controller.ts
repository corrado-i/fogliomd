import { Controller, Get, Post, Put, Delete, Body, Param, Headers, BadRequestException, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './note.schema';
import { CreateNoteDto } from './create-note.dto';
import { UpdateNoteDto } from './update-note.dto';
import { LabelsService } from '../labels/labels.service';

@Controller('notes')
export class NotesController {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    private readonly labelsService: LabelsService,
  ) { }

  @Get()
  async findAll(
    @Headers('user') user: string,
    @Query('search') search?: string,
  ): Promise<Note[]> {
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const query: any = { user };
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    return this.noteModel.find(query).populate('label').exec();
  }

  @Get('by-label/:labelId')
  async findByLabel(@Param('labelId') labelId: string): Promise<Note[]> {
    return this.noteModel.find({
      $or: [
        { label: labelId },
        { label: new Types.ObjectId(labelId) },
      ],
    }).populate('label').exec();
  }

  @Post()
  async create(@Body() createNoteDto: CreateNoteDto): Promise<Note> {
    if (!createNoteDto.user) {
      throw new BadRequestException('User not found');
    }
    const createdNote = new this.noteModel(createNoteDto);
    return createdNote.save();
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto): Promise<Note | null> {
    return this.noteModel.findByIdAndUpdate(id, updateNoteDto, { new: true }).exec();
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<any> {
    return this.labelsService.deleteNote(id);
  }
}