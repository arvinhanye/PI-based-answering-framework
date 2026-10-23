/** Host-independent import and study contracts. Amounts use decimal nano-CNY strings. */
export type QuestionKind = 'single' | 'multiple' | 'truefalse' | 'fill' | 'short';
export type StructureStatus = 'ready' | 'needs_review';
export interface SourceLocation { page?: number; paragraph?: number; bbox?: [number,number,number,number]; }
export interface AssetInput { path: string; sha256: string; mime: string; role: 'question' | 'source'; caption?: string; }
export interface PageProcessingRecord { page:number; status:'converted'|'failed'; candidateIds:string[]; unrecognizedRegions:string[]; outputHash:string; error?:string; }
export interface QuestionInput {
 sourceKey:string; kind:QuestionKind; stem:string; options:Array<{id:string;text:string}>;
 answer:string[]; rawAnswer:string; explanation:string; topics:string[];
 status:StructureStatus; basisStatus:'source_only'|'verified'|'insufficient'|'disputed';
 issues:string[]; locations:SourceLocation[]; assets:AssetInput[];
 equivalentAnswers?:string[][];
}
export interface QuestionBankInput {
 schemaVersion:1;
 source:{id:string;name:string;sha256:string;originalPath?:string;pageCount?:number;paragraphCount?:number;processing?:PageProcessingRecord[]};
 questions:QuestionInput[];
 report:{candidateCount:number;ready:number;needsReview:number;processedPages?:number;processedParagraphs?:number;gaps:string[];notes?:string[]};
}
export interface ConversionResult { bank:QuestionBankInput; outputPath:string; }
export interface SourceInput { path:string; outputDir:string; }
export interface UserActionContext { origin:'cli'|'pi-interactive'|'pi-menu';eventId:string; }
export interface Bank {id:string;name:string;createdAt:string;}
export interface QuestionView {questionRevisionId:string;questionId:string;sourceId:string;sourceKey:string;kind:QuestionKind;stem:string;options:Array<{id:string;text:string}>;topics:string[];status:StructureStatus;issueCount:number;locations:SourceLocation[];assets:AssetInput[];presentationId:string;sessionId:string;}
export interface SubmissionInput {sessionId:string;presentationId:string;questionRevisionId:string;answer:string[];confidence:'sure'|'unsure';idempotencyKey:string;}
export interface GradeResult {status:'scored'|'unscorable'|'disputed';score:number|null;maxScore:number;correct:boolean|null;basisStatus:string;reason:string;}
export interface SubmissionReceipt {id:string;presentationId:string;grade:GradeResult;assisted:boolean;createdAt:string;}
export interface FeedbackView {questionRevisionId:string;answer:string[];rawAnswer:string;explanation:string;issues:string[];grade?:GradeResult;}
export interface StartSessionInput {bankId:string;mode?:'quick'|'deep'|'exam';sourceId?:string;topic?:string;selection?:'adaptive'|'random'|'sequential'|'wrong';examDate?:string;timezone?:string;}
export interface SessionView {id:string;bankId:string;mode:string;status:string;createdAt:string;currentPresentationId:string|null;}
export interface SessionSnapshot {session:SessionView;question:QuestionView|null;draft:string[];assisted:boolean;}
