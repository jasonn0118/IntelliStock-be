import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../constants/user-contants';

@Injectable()
export class AdminInternalRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.INTERNAL_USER) {
      return true;
    }

    throw new ForbiddenException(
      'This endpoint is accessible only to admin and internal users',
    );
  }
}
