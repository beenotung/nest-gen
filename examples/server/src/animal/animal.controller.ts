import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ok } from '../utils';

/*
* multi line comment 1
* */

/**
 * multi line comment 2
 * */
@Controller('animal')
export class AnimalController {
  @Post('talk')
  async talk(@Res()res): Promise<string> {
    let data = 'this animal is talking';
    res.status(HttpStatus.OK).json(data);
    return data;
  }

  // single line comment
  @Get('name')
  async name(@Res()res): Promise<{ type: string, value: string }> {
    let data = {
      type: 'string',
      value: 'animal name',
    };
    res.status(HttpStatus.OK).json(data);
    return data;
  }

  // comment with {curry bracket} 1
  @Get('/get_echo/:Msg/:User')
  async get_echo(@Res()res, @Param('Msg')Msg, @Param('User')User): Promise<{ Msg: string, User: string }> {
    return ok(res, { Msg, User });
  }

  // comment with {curry bracket 2
  @Post('/post_echo')
  async post_echo(@Res()res, @Body('Msg')Msg): Promise<{ Msg: string }> {
    return ok(res, { Msg });
  }
}
