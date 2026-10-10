import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

declare const module: any;

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        // GitHub signs webhooks over the exact bytes it sent, so the raw body
        // has to survive parsing for the HMAC check to work.
        rawBody: true,
    });
    // Express defaults to a 100 KB JSON limit. The editor's save endpoint
    // accepts up to 5 MB per commit, so the parser has to allow more than the
    // endpoint does.
    app.useBodyParser('json', { limit: '6mb' });
    app.useWebSocketAdapter(new WsAdapter(app));

    // Use Winston logger
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    const configService = app.get<ConfigService>(ConfigService);
    const port = configService.get<number>('app.port') || 3000;
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.enableCors({
        origin: '*',
    });

    const config = new DocumentBuilder()
        .setTitle('Bitshala API')
        .setDescription('API documentation for Bitshala')
        .addBearerAuth()
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);

    await app.listen(port);

    if (module.hot) {
        module.hot.accept();
        module.hot.dispose(() => app.close());
    }
}
bootstrap();
