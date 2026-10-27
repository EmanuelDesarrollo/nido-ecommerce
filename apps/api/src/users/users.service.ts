import { Injectable } from '@nestjs/common';
import { isClues, MeDto, UserDto } from '@nido/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserDto[]> {
    return this.prisma.user.findMany({ select: { id: true, name: true, avatarUrl: true }, orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<UserDto | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true, avatarUrl: true } });
  }

  async findMe(id: string): Promise<MeDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const { tasteProfile, ...rest } = user;
    return { ...rest, tasteProfile: isClues(tasteProfile) ? tasteProfile : null };
  }
}
