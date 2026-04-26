import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdjustUserTokenBalanceDto } from './dto/adjust-user-token-balance.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Req() req: any, @Query('search') search?: string) {
    this.ensureAdmin(req);
    return this.usersService.findAll(search);
  }

  @Patch(':id/role')
  updateRole(
    @Req() req: any,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    this.ensureAdmin(req);
    return this.usersService.updateRole(userId, dto.role);
  }

  @Patch(':id/tokens')
  addTokens(
    @Req() req: any,
    @Param('id') userId: string,
    @Body() dto: AdjustUserTokenBalanceDto,
  ) {
    this.ensureAdmin(req);
    return this.usersService.adjustTokenBalance(userId, dto.amount);
  }

  @Patch(':id/ban')
  banUser(@Req() req: any, @Param('id') userId: string) {
    this.ensureAdmin(req);
    if (req.user?.sub === userId || req.user?.id === userId) {
      throw new ForbiddenException('Нельзя заблокировать себя');
    }
    return this.usersService.banUser(userId);
  }

  @Patch(':id/unban')
  unbanUser(@Req() req: any, @Param('id') userId: string) {
    this.ensureAdmin(req);
    return this.usersService.unbanUser(userId);
  }

  private ensureAdmin(req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Нет доступа к панели пользователей');
    }
  }
}
