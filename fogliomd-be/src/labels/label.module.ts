import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Label, LabelSchema } from './label.schema';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';
import { Note, NoteSchema } from '../notes/note.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Label.name, schema: LabelSchema },
      { name: Note.name, schema: NoteSchema },
    ]),
  ],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelModule {}