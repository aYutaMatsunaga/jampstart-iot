#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { JampstartIotStack } from '../lib/jampstart-iot-stack';

const app = new cdk.App();
new JampstartIotStack(app, 'JampstartIotStack');
