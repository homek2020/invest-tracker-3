import assert from 'assert';
import { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as planScenarioController from '../controllers/planScenario.controller';
import { resetPlanScenarioRepository, setPlanScenarioRepository } from '../services/planScenario.service';
import { planScenarioRepository } from '../data/repositories/planScenario.repository';
import { AccountCurrency } from '../domain/models/Account';

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
  send: (payload?: any) => MockResponse;
};

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    status: (code: number) => {
      res.statusCode = code;
      return res;
    },
    json: (payload: any) => {
      res.body = payload;
      return res;
    },
    send: (payload?: any) => {
      res.body = payload;
      return res;
    },
  };
  return res;
}

async function test(name: string, fn: () => Promise<void> | void): Promise<boolean> {
  try {
    await fn();
    console.log(`✔️  ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    return false;
  } finally {
    resetPlanScenarioRepository();
  }
}

async function run() {
  const results: boolean[] = [];

  results.push(
    await test('auth middleware rejects missing bearer token', () => {
      const req = { headers: {} } as AuthRequest;
      const res = createMockResponse();
      let nextCalled = false;
      authMiddleware(req, res as any, () => {
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.error_code, 'AUTH_REQUIRED');
    })
  );

  results.push(
    await test('plan scenarios list returns payload', async () => {
      const fakeList = [
        {
          id: '1',
          userId: 'user1',
          name: 'Scenario A',
          currency: AccountCurrency.RUB,
          startYear: 2024,
          startMonth: 10,
          initialAmount: 100000,
          annualReturnPct: 12,
          monthlyInflow: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setPlanScenarioRepository({
        ...planScenarioRepository,
        findAllByUser: async () => fakeList,
      });
      const res = createMockResponse();
      await planScenarioController.list({ userId: 'user1' } as AuthRequest, res as any);
      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body, { success: true, planScenarios: fakeList });
    })
  );

  results.push(
    await test('create plan scenario validates input', async () => {
      const res = createMockResponse();
      await planScenarioController.create(
        { userId: 'user1', body: { currency: 'USD' } } as unknown as AuthRequest,
        res as any
      );
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error_code, 'VALIDATION_ERROR');
    })
  );

  results.push(
    await test('successful creation returns created plan scenario', async () => {
      const created = {
        id: '123',
        userId: 'user1',
        name: 'Base case',
        currency: AccountCurrency.USD,
        startYear: 2025,
        startMonth: 1,
        initialAmount: 150000,
        annualReturnPct: 8,
        monthlyInflow: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setPlanScenarioRepository({
        ...planScenarioRepository,
        create: async () => created,
      });
      const res = createMockResponse();
      await planScenarioController.create(
        {
          userId: 'user1',
          body: {
            name: 'Base case',
            currency: AccountCurrency.USD,
            startYear: 2025,
            startMonth: 1,
            initialAmount: 150000,
            annualReturnPct: 8,
            monthlyInflow: 10000,
          },
        } as AuthRequest,
        res as any
      );
      assert.strictEqual(res.statusCode, 201);
      assert.deepStrictEqual(res.body, { success: true, planScenario: created });
    })
  );

  results.push(
    await test('update handles missing plan scenario', async () => {
      setPlanScenarioRepository({
        ...planScenarioRepository,
        updateForUser: async () => null,
      });
      const res = createMockResponse();
      await planScenarioController.update(
        { userId: 'user1', params: { planScenarioId: 'bad-id' }, body: {} } as unknown as AuthRequest,
        res as any
      );
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error_code, 'NOT_FOUND');
    })
  );

  results.push(
    await test('delete returns 204 on success', async () => {
      setPlanScenarioRepository({
        ...planScenarioRepository,
        deleteForUser: async () => true,
      });
      const res = createMockResponse();
      await planScenarioController.remove(
        { userId: 'user1', params: { planScenarioId: '123' } } as unknown as AuthRequest,
        res as any
      );
      assert.strictEqual(res.statusCode, 204);
      assert.strictEqual(res.body, undefined);
    })
  );

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(`\nTests finished. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
