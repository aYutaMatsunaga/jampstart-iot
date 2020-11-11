#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { IotStack } from '../lib/iotStack'
import { LambdaStack } from '../lib/lambdaStack'

const app = new cdk.App()
const { greengrassLambdaAlias } = new LambdaStack(app, 'LambdaStack')
new IotStack(app, 'IoTStack', { greengrassLambdaAlias })
