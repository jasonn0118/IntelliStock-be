import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies['access_token'];

    const isAuthenticated = (await super.canActivate(context)) as boolean;

    if (!isAuthenticated || !request.user) {
      throw new UnauthorizedException('Invalid authentication');
    }

    return true;
  }
}
