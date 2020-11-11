import * as cdk from '@aws-cdk/core'
import * as iot from '@aws-cdk/aws-iot'
import * as ssm from '@aws-cdk/aws-ssm'
import * as greengrass from '@aws-cdk/aws-greengrass'
import * as lambda from '@aws-cdk/aws-lambda'

interface IotStackProps extends cdk.StackProps {
  greengrassLambdaAlias: lambda.Alias
}

export class IotStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: IotStackProps) {
    super(scope, id, props)

    const certArn = ssm.StringParameter.fromStringParameterAttributes(this, 'IotCertificateArn', {
      parameterName: 'jampstart-iot-crt-arn',
    }).stringValue
    const region: string = cdk.Stack.of(this).region
    const accountId: string = cdk.Stack.of(this).account

    // AWS IoTのモノの作成
    const iotThing = new iot.CfnThing(this, 'Thing', {
      thingName: 'Raspberry_Pi_Thing'
    })

    if (iotThing.thingName !== undefined) {
      
      const thingArn = `arn:aws:iot:${region}:${accountId}:thing/${iotThing.thingName}`

      // ポリシーを作成
      const iotPolicy = new iot.CfnPolicy(this, 'Policy', {
        policyName: 'Raspberry_Pi_Policy',
        policyDocument: {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "iot:*",
                "greengrass:*",
              ],
              "Resource": [
                "*"
              ]
            }
          ]
        }
      })
      iotPolicy.addDependsOn(iotThing)

      // 証明書にポリシーをアタッチ
      if (iotPolicy.policyName !== undefined) {
        const policyPrincipalAttachment = new iot.CfnPolicyPrincipalAttachment(this, 'PolicyPrincipalAttachment', {
          policyName: iotPolicy.policyName,
          principal: certArn
        })
        policyPrincipalAttachment.addDependsOn(iotPolicy)
      }

      // モノに証明書をアタッチ
      const thingPrincipalAttachment = new iot.CfnThingPrincipalAttachment(this, 'ThingPrincipalAttachment', {
        thingName: iotThing.thingName,
        principal: certArn
      })
      thingPrincipalAttachment.addDependsOn(iotThing)

      // Greengrass Coreの作成
      const coreDefinition = new greengrass.CfnCoreDefinition(this, 'CoreDefinition', {
        name: 'Raspberry_Pi_Core',
        initialVersion: {
          cores: [
            {
              certificateArn: certArn,
              id: '1',
              thingArn,
            }
          ]
        }
      })
      coreDefinition.addDependsOn(iotThing)

      // Greengrassリソースの作成
      const resourceDefinition = new greengrass.CfnResourceDefinition(this, 'ResourceDefinition', {
        name: 'Raspberry_Pi_Resource',
        initialVersion: {
          resources: [
            {
              id: '1',
              name: 'log_file_resource',
              resourceDataContainer: {
                localVolumeResourceData: {
                  sourcePath: '/log',
                  destinationPath: '/log'
                }
              }
            }
          ]
        }
      })

      // Greengrass Lambdaの作成
      const functionDefinition = new greengrass.CfnFunctionDefinition(this, 'FunctionDefinition', {
        name: 'Raspberry_Pi_Function',
        initialVersion: {
          functions: [
            {
              id: '1',
              functionArn: props.greengrassLambdaAlias.functionArn,
              functionConfiguration: {
                encodingType: 'binary',
                memorySize: 65536,
                pinned: true,
                timeout: 3,
                environment: {
                  // ログファイルを書き出すため、リソースの書き込み権限を与える
                  resourceAccessPolicies: [
                    {
                      resourceId: '1',
                      permission: 'rw'
                    }
                  ]
                }
              }
            }
          ]
        }
      })

      // Greengrassグループの作成
      const group = new greengrass.CfnGroup(this, 'Group', {
        name: 'Raspberry_Pi',
        initialVersion: {
          coreDefinitionVersionArn: coreDefinition.attrLatestVersionArn,
          resourceDefinitionVersionArn: resourceDefinition.attrLatestVersionArn,
          functionDefinitionVersionArn: functionDefinition.attrLatestVersionArn
        }
      })

      // 一連のDefinitionの作成が終わったらグループを作成
      group.addDependsOn(coreDefinition)
      group.addDependsOn(resourceDefinition)
      group.addDependsOn(functionDefinition)
    }
  }
}
