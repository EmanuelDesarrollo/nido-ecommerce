import {
  CATEGORIES,
  Category,
  CheckoutRequest,
  CreateGiftRequest,
  MAX_MESSAGE_LENGTH,
  REACTIONS,
  Size,
  SIZES,
  Style,
  STYLES,
  ThanksRequest,
} from '@nido/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
} from 'class-validator';
import { FutureExpiryConstraint, LuhnConstraint } from './card.validators';

const trimmed = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateGiftDto implements CreateGiftRequest {
  @IsString()
  @MinLength(1)
  recipientId: string;

  @IsInt()
  @Min(10_000)
  @Max(5_000_000)
  budgetCop: number;
}

export class AnswerCluesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(CATEGORIES, { each: true })
  favoriteCategories: Category[];

  @IsIn(STYLES)
  style: Style;

  @IsIn(SIZES)
  size: Size;

  /** Omitted or null means "Nada, sorpréndeme". */
  @IsOptional()
  @IsIn(CATEGORIES)
  avoidCategory?: Category | null;
}

export class CheckoutDto implements CheckoutRequest {
  @IsInt()
  productId: number;

  @IsInt()
  variantId: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  @Transform(trimmed)
  message?: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Validate(LuhnConstraint)
  cardNumber: string;

  @Validate(FutureExpiryConstraint)
  expiry: string;

  @Matches(/^\d{3}$/, { message: 'cvc must be 3 digits' })
  cvc: string;
}

export class ThanksDto implements ThanksRequest {
  @IsIn(REACTIONS)
  reaction: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  @Transform(trimmed)
  thankYouNote?: string;
}
