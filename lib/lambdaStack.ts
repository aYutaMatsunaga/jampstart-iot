import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'

export class LambdaStack extends cdk.Stack {
  public readonly greengrassLambdaAlias: lambda.Alias

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // GreengrassにデプロイするLambda関数の作成
    const greengrassLambda = new lambda.Function(this, 'GreengrassSampleHandler', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'handler.handler',
    })
    const version = new lambda.Version(this, 'GreengrassSampleVersion', {
      lambda: greengrassLambda
    })

    // Greengrass Lambdaとして使用する場合、エイリアスを指定する必要がある
    this.greengrassLambdaAlias = new lambda.Alias(this, 'GreengrassSampleAlias', {
      aliasName: 'rasberrypi',
      version: version
    })
  }
}