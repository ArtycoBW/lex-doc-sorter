import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileController } from './profile.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, ProfileController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
