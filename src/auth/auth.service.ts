import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    try {
      return await this.prismaService.user.create({
        data: { email: dto.email, password: passwordHash },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(user.password, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({ sub: user.id });
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  refresh(refreshToken: string) {
    let payload: { sub: number };
    try {
      payload = this.jwtService.verify<{ sub: number }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = this.jwtService.sign({ sub: payload.sub });
    return { accessToken };
  }
}
