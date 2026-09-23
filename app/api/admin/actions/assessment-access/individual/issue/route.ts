import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { actionFailure } from "@/modules/admin-actions/action-result";
import { createAdminActionService } from "@/modules/admin-actions/production-admin-actions";
import { isValidAdminSession, OFFLINE_ADMIN_COOKIE } from "@/lib/offline-company";
import { consumeRateLimit } from "@/lib/offline-company-rate-limit";

export const dynamic="force-dynamic";
const INDIVIDUAL_ACTION_ID="assessment-access.individual.issue";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
  let ACTION_ID=INDIVIDUAL_ACTION_ID;
  const now=new Date(); const origin=request.headers.get("origin");
  if(origin&&origin!==request.nextUrl.origin)return NextResponse.json(actionFailure({code:"ACTION_FORBIDDEN",message:"Invalid request origin.",requestId:randomUUID(),actionId:ACTION_ID,failedAt:now.toISOString()}),{status:403});
  if(!isValidAdminSession(request.cookies.get(OFFLINE_ADMIN_COOKIE)?.value))return NextResponse.json(actionFailure({code:"ACTION_FORBIDDEN",message:"Administrator authentication is required.",requestId:randomUUID(),actionId:ACTION_ID,failedAt:now.toISOString()}),{status:401});
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||request.headers.get("x-real-ip")||"unknown";
  const rate=consumeRateLimit(`admin-action:${ACTION_ID}:${ip}`,20,60*60*1000); if(!rate.allowed)return NextResponse.json(actionFailure({code:"ACTION_CONFLICT",message:"Too many issuance attempts. Try again later.",requestId:randomUUID(),actionId:ACTION_ID,failedAt:now.toISOString()}),{status:429});
  let body:Record<string,unknown>={};try{const parsed=await request.json();if(parsed&&typeof parsed==="object")body=parsed as Record<string,unknown>;}catch{}
  ACTION_ID=body.fundingType==="complimentary"?"assessment-access.complimentary.issue":INDIVIDUAL_ACTION_ID;
  const requestId=String(body.operationId||"").trim(); if(!UUID.test(requestId))return NextResponse.json(actionFailure({code:"INPUT_INVALID",message:"The operation ID is invalid.",requestId:randomUUID(),actionId:ACTION_ID,failedAt:now.toISOString()}),{status:400});
  const actorId=String(process.env.ADMIN_ACTION_ACTOR_ID||"").trim()||(process.env.NODE_ENV==="production"?"":"development-admin");
  if(!actorId)return NextResponse.json(actionFailure({code:"ACTION_FAILED",message:"Administrative actor identity is not configured.",requestId,actionId:ACTION_ID,failedAt:now.toISOString()}),{status:500});
  const capabilities=String(process.env.ADMIN_ACTION_CAPABILITIES||"").split(",").map(x=>x.trim()).filter(Boolean);
  const input={assessmentDefinitionId:body.assessmentDefinitionId,assessmentDefinitionVersion:body.assessmentDefinitionVersion,participantName:body.participantName,participantEmail:body.participantEmail,fundingType:body.fundingType,issuanceType:body.issuanceType,reportVisibility:body.reportVisibility,languageMode:body.languageMode,expiresAt:body.expiresAt,reason:body.reason};
  const context={requestId,actor:{id:actorId,role:"admin" as const,capabilities},resource:{type:"individual-issuance",id:requestId},now,ipAddress:ip,userAgent:request.headers.get("user-agent")||undefined};
  const service=createAdminActionService(); const result=body.mode==="preview"?await service.prepare(ACTION_ID,input,context):await service.execute({actionId:ACTION_ID,input,confirmation:{acknowledged:true,reason:String(body.reason||"")},context});
  return NextResponse.json(result,{status:result.ok?200:result.error.code==="ACTION_FORBIDDEN"?403:400,headers:{"Cache-Control":"no-store"}});
}
