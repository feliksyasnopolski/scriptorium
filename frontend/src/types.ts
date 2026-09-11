export const DOCUMENT_SCHEMA_VERSION = 1

export interface Subsection { id: string; title: string | null; viewer_sees: string; explanation_notes: string; script: string; estimated_seconds: number | null }
export interface Section { id: string; title: string; subsections: Subsection[] }
export interface Project { id: string; title: string; target_duration_seconds: number | null; sections: Section[]; revision: number; planned_duration_seconds?: number }
export interface ProjectDocument { schema_version: number; revision: number; project: Project }
export function plannedDurationSeconds(project: Project) { return (project.sections ?? []).reduce((total, section) => total + section.subsections.reduce((sum, subsection) => sum + (subsection.estimated_seconds ?? 0), 0), 0) }
