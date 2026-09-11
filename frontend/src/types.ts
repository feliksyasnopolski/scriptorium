export interface Subsection { id: number; title: string | null; position: number; viewer_sees: string; explanation_notes: string; script: string; estimated_seconds: number | null }
export interface Section { id: number; title: string; position: number; subsections: Subsection[] }
export interface Project { id: number; title: string; target_duration_seconds: number | null; planned_duration_seconds: number; sections: Section[] }
