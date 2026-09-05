import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { ResetearPasswordDto } from './dto/resetear-password.dto';
import { CambiarMiPasswordDto } from './dto/cambiar-mi-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

interface RequestConUsuario extends Request {
  user: { id: number };
}

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lista todos los usuarios (solo ADMIN)' })
  async listar() {
    return this.usersService.listar();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crea un nuevo usuario (solo ADMIN)' })
  async crear(@Body() dto: CrearUsuarioDto) {
    return this.usersService.crear(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualiza nombre/rol/estado activo de un usuario (solo ADMIN)' })
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    return this.usersService.actualizar(id, dto);
  }

  @Post(':id/resetear-password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'El ADMIN resetea la contraseña de otro usuario (sin pedir la anterior)' })
  async resetearPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetearPasswordDto) {
    await this.usersService.resetearPassword(id, dto.nuevaPassword);
    return { ok: true };
  }

  @Post('mi-password')
  @ApiOperation({ summary: 'El usuario autenticado cambia su propia contraseña (requiere la anterior)' })
  async cambiarMiPassword(@Body() dto: CambiarMiPasswordDto, @Req() req: RequestConUsuario) {
    await this.usersService.cambiarMiPassword(req.user.id, dto.passwordActual, dto.passwordNueva);
    return { ok: true };
  }
}
