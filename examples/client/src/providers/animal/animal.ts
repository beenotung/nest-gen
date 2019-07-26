import { Injectable } from '@angular/core';
import { Body, Controller, Get, injectNestClient, Param, Post } from 'nest-client';

@Injectable()
@Controller('animal')
export class AnimalProvider {
  constructor() {
    injectNestClient(this);
  }

  @Post('talk')
  async talk(): Promise<string> {
    return undefined as any;
  }

  @Get('name')
  async name(): Promise<{ type: string, value: string }> {
    return undefined as any;
  }

  @Get('/get_echo/:Msg/:User')
  async get_echo(@Param('Msg')Msg, @Param('User')User): Promise<{ Msg: string, User: string }> {
    return undefined as any;
  }

  @Post('/post_echo')
  async post_echo(@Body('Msg')Msg): Promise<{ Msg: string }> {
    return undefined as any;
  }
}
