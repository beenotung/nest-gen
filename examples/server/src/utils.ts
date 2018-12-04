import { HttpStatus } from '@nestjs/common';

export function ok(res, data) {
  return res.status(HttpStatus.OK).json(data);
}
