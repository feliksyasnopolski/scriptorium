export const DOCUMENT_SCHEMA_VERSION = 1

export interface Subsection { id: string; title: string | null; viewer_sees: string; explanation_notes: string; script: string; estimated_seconds: number | null }
export interface Section { id: string; title: string; subsections: Subsection[] }
export interface Project { id: string; title: string; target_duration_seconds: number | null; sections: Section[]; revision: number; planned_duration_seconds?: number }
export interface ProjectDocument { schema_version: number; revision: number; project: Project }
export function plannedDurationSeconds(project: Project) { return (project.sections ?? []).reduce((total, section) => total + section.subsections.reduce((sum, subsection) => sum + (subsection.estimated_seconds ?? 0), 0), 0) }

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function isNonNegativeInteger(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 }
function requiredString(value: unknown, field: string): string { if (typeof value !== 'string' || value.length === 0) throw new Error(`${field} must be a non-empty string`); return value }

export function parseProjectDocument(value: unknown): ProjectDocument {
  if (!isRecord(value)) throw new Error('The file must contain a JSON object')
  if (value.schema_version !== DOCUMENT_SCHEMA_VERSION) throw new Error(`Unsupported schema version (expected ${DOCUMENT_SCHEMA_VERSION})`)
  if (!isNonNegativeInteger(value.revision)) throw new Error('revision must be a non-negative integer')
  if (!isRecord(value.project)) throw new Error('project must be an object')

  const source = value.project
  requiredString(source.id, 'project.id')
  requiredString(source.title, 'project.title')
  if (source.target_duration_seconds !== null && !isNonNegativeInteger(source.target_duration_seconds)) throw new Error('project.target_duration_seconds must be a non-negative integer or null')
  if (!Array.isArray(source.sections)) throw new Error('project.sections must be an array')

  const sections: Section[] = source.sections.map((section, sectionIndex) => {
    if (!isRecord(section)) throw new Error(`project.sections[${sectionIndex}] must be an object`)
    const sectionId = requiredString(section.id, `project.sections[${sectionIndex}].id`)
    const sectionTitle = requiredString(section.title, `project.sections[${sectionIndex}].title`)
    if (!Array.isArray(section.subsections)) throw new Error(`project.sections[${sectionIndex}].subsections must be an array`)
    const subsections: Subsection[] = section.subsections.map((subsection, subsectionIndex) => {
      if (!isRecord(subsection)) throw new Error(`project.sections[${sectionIndex}].subsections[${subsectionIndex}] must be an object`)
      const path = `project.sections[${sectionIndex}].subsections[${subsectionIndex}]`
      if (subsection.id === undefined) throw new Error(`${path}.id is required`)
      const subsectionId = requiredString(subsection.id, `${path}.id`)
      if (subsection.title !== null && typeof subsection.title !== 'string') throw new Error(`${path}.title must be a string or null`)
      for (const field of ['viewer_sees', 'explanation_notes', 'script']) if (typeof subsection[field] !== 'string') throw new Error(`${path}.${field} must be a string`)
      if (subsection.estimated_seconds !== null && !isNonNegativeInteger(subsection.estimated_seconds)) throw new Error(`${path}.estimated_seconds must be a non-negative integer or null`)
      return { id: subsectionId, title: subsection.title, viewer_sees: subsection.viewer_sees as string, explanation_notes: subsection.explanation_notes as string, script: subsection.script as string, estimated_seconds: subsection.estimated_seconds as number | null }
    })
    return { id: sectionId, title: sectionTitle, subsections }
  })

  return { schema_version: DOCUMENT_SCHEMA_VERSION, revision: value.revision, project: { id: source.id as string, title: source.title as string, target_duration_seconds: source.target_duration_seconds as number | null, sections, revision: value.revision } }
}
