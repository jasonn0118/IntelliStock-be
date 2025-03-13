import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);

    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    request['user'] = request.user;

    return true;
  }
}
