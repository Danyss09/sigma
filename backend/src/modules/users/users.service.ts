import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

const RONDAS_BCRYPT = 10;
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  async listar(): Promise<Omit<User, 'passwordHash'>[]> {
    const usuarios = await this.usersRepository.find({ order: { id: 'ASC' } });
    return usuarios.map(({ passwordHash, ...resto }) => resto as Omit<User, 'passwordHash'>);
  }
 async crear(dto: CrearUsuarioDto): Promise<Omit<User, 'passwordHash'>> {
    const yaExiste = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (yaExiste) {
      throw new ConflictException(`Ya existe un usuario con el email ${dto.email}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, RONDAS_BCRYPT);
    const usuario = this.usersRepository.create({
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      rol: dto.rol,
      activo: true,
    } as any);
    const guardado = await this.usersRepository.save(usuario);
    const { passwordHash: _omit, ...resto } = guardado as any;
    return resto;
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto): Promise<Omit<User, 'passwordHash'>> {
    const usuario = await this.usersRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    Object.assign(usuario, dto);
    const guardado = await this.usersRepository.save(usuario);
    const { passwordHash: _omit, ...resto } = guardado as any;
    return resto;
  }

  /** El ADMIN resetea la clave de otro usuario (no necesita la clave anterior). */
  async resetearPassword(id: number, nuevaPassword: string): Promise<void> {
    const usuario = await this.usersRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    (usuario as any).passwordHash = await bcrypt.hash(nuevaPassword, RONDAS_BCRYPT);
    await this.usersRepository.save(usuario);
  }

  /** El propio usuario cambia su clave (sí necesita la clave anterior). */
  async cambiarMiPassword(id: number, passwordActual: string, passwordNueva: string): Promise<void> {
    const usuario = await this.usersRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    const coincide = await bcrypt.compare(passwordActual, (usuario as any).passwordHash);
    if (!coincide) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    (usuario as any).passwordHash = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
    await this.usersRepository.save(usuario);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
