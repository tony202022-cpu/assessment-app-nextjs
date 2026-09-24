import "server-only";

import { assessmentRegistry } from "@/modules/assessment-definition";
import { getDeveloperTestBaseUrl } from "@/lib/admin-assessment-access";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { AdminActionError } from "../action-errors";
import type { AdminActionDefinition } from "../action-registry";
import { createDryRunPreview } from "../dry-run-model";

export type IssueIndividualAssessmentAccessInput = {
  assessmentDefinitionId: string; assessmentDefinitionVersion: string;
  participantName: string; participantEmail: string;
  fundingType: "paid" | "complimentary";
  issuanceType: "offline-paid" | "online-paid" | "complimentary";
  reportVisibility: "participant-only" | "manager-only" | "participant-and-manager" | "admin-only";
  languageMode: "participant-choice" | "en" | "ar";
  expiresAt: string | null; reason: string;
};

export type IssueIndividualAssessmentAccessOutput = {
  policyId: string; tokenId: string; participantName: string; participantEmail: string;
  assessmentUrl: string; reportVisibility: string; languageMode: string; issuedAt: string; auditId: string;
};

const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalize=(value:unknown)=>String(value||"").trim().replace(/\s+/g," ");
function client(){const value=getSupabaseAdmin();if(!value)throw new AdminActionError("ACTION_FAILED","Assessment issuance is not configured.");return value;}

export const issueIndividualAssessmentAccessAction: AdminActionDefinition<IssueIndividualAssessmentAccessInput,IssueIndividualAssessmentAccessOutput> = {
  id:"assessment-access.individual.issue",
  title:"Issue Individual Assessment Access",
  description:"Issue one governed paid or complimentary participant entitlement.",
  permission:{anyOf:["assessment-access.individual.issue"]},
  confirmation:{level:"dangerous",mode:"reason-required",title:"Issue assessment access",message:"Create one live single-use participant access link.",confirmLabel:"Generate Access",reasonRequired:true},
  rollback:{mode:"manual",summary:"The token can be revoked without deleting its audit history.",instructions:"Set revoked_at on the issued access token through an approved operational change."},
  refresh:{strategy:"paths",paths:["/admin/access-center","/admin/complimentary"]},
  validateInput(input){
    const v=(input&&typeof input==="object"?input:{}) as Record<string,unknown>;
    const rawExpiry=normalize(v.expiresAt); const expiry=rawExpiry?new Date(rawExpiry):null;
    const value:IssueIndividualAssessmentAccessInput={
      assessmentDefinitionId:normalize(v.assessmentDefinitionId),assessmentDefinitionVersion:normalize(v.assessmentDefinitionVersion),
      participantName:normalize(v.participantName),participantEmail:normalize(v.participantEmail).toLowerCase(),
      fundingType:normalize(v.fundingType) as any,issuanceType:normalize(v.issuanceType) as any,
      reportVisibility:normalize(v.reportVisibility) as any,languageMode:normalize(v.languageMode) as any,
      expiresAt:expiry&&!Number.isNaN(expiry.getTime())?expiry.toISOString():null,reason:normalize(v.reason),
    };
    const fields:Record<string,string>={}; const definition=assessmentRegistry.getCurrent(value.assessmentDefinitionId);
    if(!definition||definition.metadata.version!==value.assessmentDefinitionVersion)fields.assessmentDefinitionId="Select a current assessment.";
    if(!definition?.capabilities.individualAvailability)fields.assessmentDefinitionId="This assessment does not support individual access.";
    if(value.fundingType==="complimentary"&&!definition?.capabilities.complimentaryAccess)fields.fundingType="Complimentary access is not enabled for this assessment.";
    if(value.participantName.length<2||value.participantName.length>200)fields.participantName="Enter the participant name.";
    if(!EMAIL.test(value.participantEmail))fields.participantEmail="Enter a valid participant email.";
    if(!["paid","complimentary"].includes(value.fundingType))fields.fundingType="Select paid or complimentary.";
    if(!["offline-paid","online-paid","complimentary"].includes(value.issuanceType))fields.issuanceType="Select an issuance type.";
    if(!["participant-only","manager-only","participant-and-manager","admin-only"].includes(value.reportVisibility))fields.reportVisibility="Select report visibility.";
    if(!["participant-choice","en","ar"].includes(value.languageMode))fields.languageMode="Select a language mode.";
    if(rawExpiry&&(!expiry||Number.isNaN(expiry.getTime())||expiry.getTime()<=Date.now()||expiry.getTime()>Date.now()+366*24*60*60*1000))fields.expiresAt="Choose a future expiry within one year.";
    if(!value.reason||value.reason.length>500)fields.reason="A reason is required (maximum 500 characters).";
    return Object.keys(fields).length?{ok:false,message:"Correct the highlighted fields.",fields}:{ok:true,value};
  },
  async dryRun(input){
    const definition=assessmentRegistry.getCurrent(input.assessmentDefinitionId);
    return createDryRunPreview({currentState:{access:"Not issued"},expectedResult:{assessment:definition?.metadata.name||input.assessmentDefinitionId,accessType:input.fundingType==="complimentary"?"COMPLIMENTARY":"Paid individual",participantName:input.participantName,participantEmail:input.participantEmail,language:input.languageMode,reportVisibility:input.reportVisibility,expiry:input.expiresAt||"No expiry",accessQuantity:1,companyCreditsConsumed:"No",reason:input.reason},affectedRecords:[{type:"access_token",id:"new",label:"Single-use participant link"},{type:"assessment_issuance_policy",id:"new",label:input.reason}],warnings:["The link is a bearer credential and must be shared securely.","No company credit is consumed."]});
  },
  auditMetadata(input){return {assessmentId:input.assessmentDefinitionId,participantEmail:input.participantEmail,fundingType:input.fundingType,reportVisibility:input.reportVisibility,issuanceType:input.issuanceType};},
  async execute(input,context){
    const {data,error}=await client().rpc("issue_individual_assessment_access_admin_action",{p_request_id:context.requestId,p_assessment_id:input.assessmentDefinitionId,p_assessment_version:input.assessmentDefinitionVersion,p_participant_name:input.participantName,p_participant_email:input.participantEmail,p_funding_type:input.fundingType,p_issuance_type:input.issuanceType,p_report_visibility:input.reportVisibility,p_language_mode:input.languageMode,p_expires_at:input.expiresAt,p_reason:input.reason,p_administrator_id:context.actor.id,p_administrator_role:context.actor.role});
    if(error)throw new AdminActionError("ACTION_FAILED","Individual access could not be issued.",{cause:error});
    const row=(Array.isArray(data)?data[0]:data) as Record<string,unknown>|null;
    if(!row?.token_value||!row?.assessment_slug)throw new AdminActionError("ACTION_FAILED","Issuance returned an incomplete result.");
    const language=input.languageMode==="participant-choice"?"":`&lang=${input.languageMode}`;
    return {policyId:String(row.policy_id),tokenId:String(row.token_id),participantName:String(row.participant_name),participantEmail:String(row.participant_email),assessmentUrl:`${getDeveloperTestBaseUrl()}/${encodeURIComponent(String(row.assessment_slug))}?token=${encodeURIComponent(String(row.token_value))}${language}`,reportVisibility:String(row.report_visibility),languageMode:String(row.language_mode),issuedAt:String(row.issued_at),auditId:String(row.audit_id)};
  }
};

export const issueComplimentaryAssessmentAccessAction: AdminActionDefinition<IssueIndividualAssessmentAccessInput,IssueIndividualAssessmentAccessOutput> = {
  ...issueIndividualAssessmentAccessAction,
  id: "assessment-access.complimentary.issue",
  title: "Issue Complimentary Assessment Access",
  permission: { anyOf: ["assessment-access.complimentary.issue"] },
};
