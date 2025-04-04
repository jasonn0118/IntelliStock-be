import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../constants/user-contants';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = parseInt(request.params.id, 10);

    // If no authenticated user, deny access
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // Allow if user is an admin
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Allow if user is accessing their own resource
    if (user.id === userId) {
      return true;
    }

    // Deny access in all other cases
    throw new ForbiddenException(
      'You can only access your own information unless you are an admin',
    );
  }
}
