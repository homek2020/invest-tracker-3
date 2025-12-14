import { planScenarioRepository } from '../data/repositories/planScenario.repository';
import { PlanScenarioCreateDto, PlanScenarioUpdateDto } from '../domain/dto/planScenario.dto';
import { PlanScenario } from '../domain/models/PlanScenario';

let repository = planScenarioRepository;

export function setPlanScenarioRepository(mock: typeof planScenarioRepository) {
  repository = mock;
}

export function resetPlanScenarioRepository() {
  repository = planScenarioRepository;
}

export async function listPlanScenarios(userId: string): Promise<PlanScenario[]> {
  return repository.findAllByUser(userId);
}

export async function getPlanScenario(userId: string, planScenarioId: string): Promise<PlanScenario | null> {
  return repository.findByIdForUser(userId, planScenarioId);
}

export async function createPlanScenario(userId: string, dto: PlanScenarioCreateDto): Promise<PlanScenario> {
  return repository.create(userId, dto);
}

export async function updatePlanScenario(
  userId: string,
  planScenarioId: string,
  dto: PlanScenarioUpdateDto
): Promise<PlanScenario | null> {
  return repository.updateForUser(userId, planScenarioId, dto);
}

export async function deletePlanScenario(userId: string, planScenarioId: string): Promise<boolean> {
  return repository.deleteForUser(userId, planScenarioId);
}
