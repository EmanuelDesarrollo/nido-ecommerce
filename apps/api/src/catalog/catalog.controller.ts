import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CatalogResponse, UserDto } from '@nido/shared';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../common/current-user.decorator';
import { UserGuard } from '../common/user.guard';
import { CatalogService } from './catalog.service';

class CatalogQuery {
  @IsString()
  @MinLength(1)
  giftId: string;
}

@Controller('products')
@UseGuards(UserGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query() query: CatalogQuery, @CurrentUser() user: UserDto): Promise<CatalogResponse> {
    return this.catalog.forGift(query.giftId, user.id);
  }
}
