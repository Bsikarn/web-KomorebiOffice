import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkplaceController } from './workplace.controller';
import { WorkplaceService } from './workplace.service';

@Module({ imports: [AuthModule], controllers: [WorkplaceController], providers: [WorkplaceService] })
export class WorkplaceModule {}
