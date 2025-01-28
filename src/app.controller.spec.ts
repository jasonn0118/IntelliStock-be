// app.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { DatabaseModule } from './database/database.module';

// Adjust path to where your DatabaseModule is located

describe('AppController (Integration Test)', () => {
  let appController: AppController;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Create a real module with the DatabaseModule
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule, // This should establish a real connection to your test DB
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    // Retrieve your controller and the DataSource from the Nest container
    appController = moduleFixture.get<AppController>(AppController);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // If for some reason TypeORM isn't auto-initializing, you can manually do it:
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    // Optionally run migrations if you rely on them:
    // await dataSource.runMigrations();
  });

  afterAll(async () => {
    // Cleanly close the DB connection to avoid open handles in Jest
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('healthCheck', () => {
    it('should return "UP" if the real database connection is initialized', async () => {
      // Because it's a real DB connection, if initialization succeeded,
      // the dataSource.isInitialized should be true.
      const result = await appController.healthCheck();
      expect(result).toEqual({ status: 'UP' });
    });

    it('should return "DOWN" if the datasource is not connected', async () => {
      // Destroy the DB connection to simulate a down connection
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }

      const result = await appController.healthCheck();
      expect(result).toEqual({ status: 'DOWN' });
    });
  });
});
