import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Matches openapi LoginRequest.
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
