import { Controller, Get, Post, Put, Delete, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { Label } from './label.schema';
import { CreateLabelDto } from './create-label.dto';
import { UpdateLabelDto } from './update-label.dto';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) { }

  @Get()
  async findAll(@Headers('user') user: string): Promise<Label[]> {
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.labelsService.findAll(user);
  }

  @Post()
  async create(@Body() createLabelDto: CreateLabelDto): Promise<Label> {
    if (!createLabelDto.user) {
      throw new BadRequestException('User not found');
    }
    return this.labelsService.create(createLabelDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateLabelDto: UpdateLabelDto): Promise<Label | null> {
    return this.labelsService.update(id, updateLabelDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<any> {
    return this.labelsService.delete(id);
  }
}