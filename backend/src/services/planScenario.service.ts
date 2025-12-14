import { planScenarioRepository } from '../data/repositories/planScenario.repository';
import { PlanScenarioCreateDto, PlanScenarioUpdateDto } from '../domain/dto/planScenario.dto';
import { PlanScenario } from '../domain/models/PlanScenario';

export async function listPlanScenarios(userId: string): Promise<PlanScenario[]> {
  return planScenarioRepository.findAllByUser(userId);
}

export async function getPlanScenario(userId: string, planScenarioId: string): Promise<PlanScenario | null> {
  return planScenarioRepository.findByIdForUser(userId, planScenarioId);
}

export async function createPlanScenario(userId: string, dto: PlanScenarioCreateDto): Promise<PlanScenario> {
  return planScenarioRepository.create(userId, dto);
}

export async function updatePlanScenario(
  userId: string,
  planScenarioId: string,
  dto: PlanScenarioUpdateDto
): Promise<PlanScenario | null> {
  return planScenarioRepository.updateForUser(userId, planScenarioId, dto);
}

export async function deletePlanScenario(userId: string, planScenarioId: string): Promise<boolean> {
  return planScenarioRepository.deleteForUser(userId, planScenarioId);
}
