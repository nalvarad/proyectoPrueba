#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MsGirosConciliacionStack } from '../lib/int-ms-giros-conciliacion-stack';
import { BuildConfig } from '../config/buildConfig';

const app = new cdk.App();
const nameStackApplication = `ms-giros-conciliacion`;
const Main = async (app: any) => {

  const stage = app.node.tryGetContext("stage") || "dev";
  const region = app.node.tryGetContext("region") || "us-east-1";

  const buildCondig = new BuildConfig(nameStackApplication, stage);
  const config: any = await buildCondig.getConfig();
  
  new MsGirosConciliacionStack(app, `${nameStackApplication}-${stage}`, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: region
    },
    tags: config
  });
}

Main(app);