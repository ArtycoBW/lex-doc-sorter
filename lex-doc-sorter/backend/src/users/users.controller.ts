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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdjustUserTokenBalanceDto } from './dto/adjust-user-token-balance.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.usersService.findAll(search);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(userId, dto.role);
  }

  @Patch(':id/tokens')
  addTokens(
    @Param('id') userId: string,
    @Body() dto: AdjustUserTokenBalanceDto,
  ) {
    return this.usersService.adjustTokenBalance(userId, dto.amount);
  }

  @Patch(':id/ban')
  banUser(@Req() req: any, @Param('id') userId: string) {
    if (req.user?.sub === userId || req.user?.id === userId) {
      throw new ForbiddenException('Нельзя заблокировать себя');
    }
    return this.usersService.banUser(userId);
  }

  @Patch(':id/unban')
  unbanUser(@Param('id') userId: string) {
    return this.usersService.unbanUser(userId);
  }
}
