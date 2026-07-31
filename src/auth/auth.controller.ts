import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { CookieOptions, Request, Response } from 'express';

const isProduction = Boolean(process.env.CORS_ORIGIN);

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    const { password: _password, ...result } = user;
    return result;
  }
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie('refreshToken', refreshToken, {
      ...refreshCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken };
  }
  @Post('refresh')
  refresh(@Req() req: Request) {
    return this.authService.refresh(req.cookies.refreshToken);
  }
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', refreshCookieOptions);
  }
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: Request) {
    return req.user;
  }
}
