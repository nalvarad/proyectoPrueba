import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';

export class MsGirosConciliacionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config: any = props?.tags;

    // ======== Red: VPC, Subnets, SG ========
    /*
    const vpcLambda = ec2.Vpc.fromVpcAttributes(this, 'ImportedVPC', {
      vpcId: config.VPC_ID,
      availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
    });

    const subnetsLambda = [
      config.SUBNET_1a,
      config.SUBNET_1b,
      config.SUBNET_1c,
    ].map((subnetId) =>
      ec2.Subnet.fromSubnetId(this, subnetId, subnetId)
    );

    const securityGroupLambda = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedSG',
      config.SECURITY_GROUP_DEFAULT
    );
    */

    // ======== Log Group para Step Functions ========
    const logGroup = new logs.LogGroup(this, 'StepFunctionLogGroup', {
      logGroupName: `${this.stackName}-step-func-log-group`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new logs.LogGroup(this, 'registerDiscrepanciesLogGroup', {
      logGroupName: `/aws/lambda/${this.stackName}-register-discrepancies`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new logs.LogGroup(this, 'registerAuditLogGroup', {
      logGroupName: `/aws/lambda/${this.stackName}-register-audit`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new logs.LogGroup(this, 'consultarOnlinePaymentsLogGroup', {
      logGroupName: `/aws/lambda/${this.stackName}-consultar-online-payments`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new logs.LogGroup(this, 'consumeServicesLogGroup', {
      logGroupName: `/aws/lambda/${this.stackName}-consumeServices`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // ======== IAM Role para Lambda ========
    const role = new iam.Role(this, `MyRole`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${this.stackName}-lambda-role`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // ======== IAM Role para Step Functions ========
    const roleStepFunction = new iam.Role(this, `MyRoleSts`, {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      roleName: `${this.stackName}-stepfn-role`,
    });

    roleStepFunction.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'lambda:InvokeFunction',
          'states:StartExecution',
          'secretsmanager:GetSecretValue',
        ],
        resources: ['*'],
      })
    );

    // ======== Event Bus ========
    const eventBusARN = config.EVENT_BUS_ARN;

    // ======== Tablas DynamoDB ========

    // Tabla de discrepancias
    const discrepanciasTable = new dynamodb.Table(this, "discrepancies", {
      tableName: `${this.stackName}-discrepancies`,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: "orderNo",
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expirationDateClean'
    });

    // Tabla de auditorias
    const auditoriaTable = new dynamodb.Table(this, "audit", {
      tableName: `${this.stackName}-audit`,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: "orderNo",
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expirationDateClean'
    });

    // Tabla de giros pagados (OJO)
    const tableOnlinePayment = dynamodb.Table.fromTableName(this, "tablaOnlinePayments", config.TABLE_ONLINE_PAYMENTS);

    // ======== Lambda RegisterDiscrepancias ========
    const fnRegisterDiscrepancias = new NodejsFunction(this, "registerDiscrepanciesFn", {
      functionName: `${this.stackName}-register-discrepancies`,
      entry: path.join(__dirname, `/../src/functions/registerDiscrepancies.function.ts`),
      handler: 'registerDiscrepancies',
      runtime: lambda.Runtime.NODEJS_16_X,
      environment: {
        TABLA_DATA_NAME: discrepanciasTable.tableName,
      },
      role: role,
      tracing: lambda.Tracing.ACTIVE,
      //logRetention: 1.
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      // vpc: vpcLambda,
      // vpcSubnets: { subnets: subnetsLambda },
      // securityGroups: [securityGroupLambda],
    });

    // ======== Lambda fnRegisterAuditoria ========
    const fnRegisterAuditoria = new NodejsFunction(this, "registerAuditFn", {
      functionName: `${this.stackName}-register-audit`,
      entry: path.join(__dirname, `/../src/functions/registerAudit.function.ts`),
      handler: 'registerAudit',
      runtime: lambda.Runtime.NODEJS_16_X,
      environment: {
        TABLA_DATA_NAME: auditoriaTable.tableName,
      },
      role: role,
      tracing: lambda.Tracing.ACTIVE,
      //logRetention: 1.
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      // vpc: vpcLambda,
      // vpcSubnets: { subnets: subnetsLambda },
      // securityGroups: [securityGroupLambda],
    });



    // ======== Lambda para traer datos de dynamodb ========
    const fnConsultarData = new NodejsFunction(this, 'ConsultarTablaDataFn', {
      functionName: `${this.stackName}-consultar-online-payments`,
      entry: path.join(__dirname, `/../src/functions/getOnlinePayments.function.ts`),
      handler: 'getOnlinePayments',
      runtime: lambda.Runtime.NODEJS_16_X,
      environment: {
        TABLA_DATA_NAME: tableOnlinePayment.tableName,
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      role: role,
      tracing: lambda.Tracing.ACTIVE,
      //logRetention: 1.
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      //vpc: vpcLambda,
      //vpcSubnets: { subnets: existingSubnet },
      //securityGroups: [securityGroupLambda_1],
    });

    // ======== Lambda para traer datos de Onpremise ========
    const fnConsumeServices = new NodejsFunction(this, `consumeServicesFn`, {
      functionName: `${this.stackName}-consumeServices`,
      environment: {
        REQUEST_ORDER: config.OCP_REQUEST_ONLINE_ORDER_CORE,
        VALIDATE_STATUS_ORDER: config.OCP_VALIDATE_STATUS_ONLINE_ORDER,
        PAY_ORDER: config.OCP_PAY_ONLINE_ORDER,
        URL_API_PRUEBA: config.URL_API_PRUEBA,
      },
      memorySize: 1024,
      timeout: cdk.Duration.seconds(15),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "consumeServices",
      //logRetention: 1.
      role: role,
      tracing: lambda.Tracing.ACTIVE,
      entry: path.join(__dirname, `/../src/functions/consumeServices.ts`),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ["aws-sdk"],
      },
      //vpc: vpcLambda,
      //vpcSubnets: { subnets: existingSubnet },
      //securityGroups: [securityGroupLambda_1]
    });

    // ======== Lambda para comparaDiscrepancias ========
    const fncompararDiscrepancias = new NodejsFunction(this, `compararDiscrepanciasFn`, {
      functionName: `${this.stackName}-compare-discrepancies`,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(15),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "compareDiscrepancies",
      //logRetention: 1.
      role: role,
      tracing: lambda.Tracing.ACTIVE,
      entry: path.join(__dirname, `/../src/functions/compareDiscrepancies.function.ts`),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ["aws-sdk"],
      },
      //vpc: vpcLambda,
      //vpcSubnets: { subnets: existingSubnet },
      //securityGroups: [securityGroupLambda_1]
    });

    // ======== Permiso de las tablas a las lambdas ========
    discrepanciasTable.grantWriteData(fnRegisterDiscrepancias);
    auditoriaTable.grantWriteData(fnRegisterAuditoria);
    tableOnlinePayment.grantReadData(fnConsultarData);


    // ======== Step Function: Flujo de conciliación ========
    // 1. Consultar DynamoDB
    const consultarDynamoTask = new tasks.LambdaInvoke(this, 'TaskConsultarDynamoDB', {
      lambdaFunction: fnConsultarData,
      outputPath: '$',               // ⚠️ dejamos todo el output (incluye Payload)
      resultPath: '$.dynamoData'     // lo guardamos en dynamoData
    });

    // 2. Extraer solo el arreglo limpio de Payload
    const prepararItemsMap = new sfn.Pass(this, 'ExtraerSoloArregloDeDynamo', {
      parameters: {
        'dynamoItems.$': '$.dynamoData.Payload' // 🔥 tomamos solo el arreglo de respuesta
      }
    });

    // 3. Map para consultar Sybase por cada orden
    const mapConsultarSybase = new sfn.Map(this, 'ConsultarCadaOrdenEnSybase', {
      itemsPath: '$.dynamoItems',
      resultPath: '$.sybaseData',
      maxConcurrency: 3 // prueba con 5, puedes ajustar luego
    });


    mapConsultarSybase.iterator(
      new tasks.LambdaInvoke(this, 'TaskConsultarSybasePorOrderNo', {
        lambdaFunction: fnConsumeServices,
        payload: sfn.TaskInput.fromObject({
          orderNo: sfn.JsonPath.stringAt('$.orderNo')
        }),
        outputPath: '$.Payload'
      }).addRetry({
          errors: [
            'Lambda.ServiceException',
            'Lambda.AWSLambdaException',
            'Lambda.SdkClientException',
            'Lambda.TooManyRequestsException'
          ],
          interval: Duration.seconds(2),
          backoffRate: 2.0,
          maxAttempts: 3
        })
    )


    // 4. Unir data para comparación
    const prepararComparacion = new sfn.Pass(this, 'PrepararComparacion', {
      parameters: {
        "dynamoData.$": "$.dynamoItems",
        "sybaseData.$": "$.sybaseData"
      }
    });

    // 5. Comparar resultados
    const compararDiscrepanciasTask = new tasks.LambdaInvoke(this, 'TaskCompararDiscrepancias', {
      lambdaFunction: fncompararDiscrepancias,
      inputPath: '$',
      outputPath: '$.Payload'
    });

    // 6. Notificar discrepancia
    const notificarDiscrepancia = new sfn.Pass(this, 'PasoNotificarDiscrepancia');

    // 7. Ejecutar pago
    const ejecutarPago = new sfn.Pass(this, 'PasoEjecutarPago');

    // 8. Ejecutar reverso
    const ejecutarReverso = new sfn.Pass(this, 'PasoEjecutarReverso');

    // 9. Notificar éxito
    const notificarExitoTransaccion = new sfn.Pass(this, 'PasoNotificarExito');

    // 10. Flujo de pago
    const flujoPago = ejecutarPago.next(notificarExitoTransaccion);

    // 11. Flujo de reverso
    const flujoReverso = ejecutarReverso.next(notificarExitoTransaccion);

    // 12. Decisión: pago o reverso
    const evaluarTipoAccion = new sfn.Choice(this, 'DecisionPagoOReverso')
      .when(sfn.Condition.stringEquals('$.tipoAccion', 'pago'), flujoPago)
      .when(sfn.Condition.stringEquals('$.tipoAccion', 'reverso'), flujoReverso);

    // 13. Flujo si hubo discrepancia
    const flujoConDiscrepancia = notificarDiscrepancia.next(evaluarTipoAccion);

    // 14. Evaluar si hubo discrepancia
    const evaluarResultado = new sfn.Choice(this, 'DecisionHayDiscrepancia')
      .when(sfn.Condition.booleanEquals('$.huboDiscrepancia', true), flujoConDiscrepancia)
      .otherwise(new sfn.Succeed(this, 'SinDiscrepanciasFinalizado'));

    // 15. Encadenar todo el flujo
    const flujoConciliacion = consultarDynamoTask
      .next(prepararItemsMap)
      .next(mapConsultarSybase)
      .next(prepararComparacion)
      .next(compararDiscrepanciasTask)
      .next(evaluarResultado);

    // 16. Crear la Step Function
    new sfn.StateMachine(this, 'StateMachineConciliacion', {
      stateMachineName: `${this.stackName}-sfn-conciliacion`,
      definition: flujoConciliacion,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
      tracingEnabled: true,
      role: roleStepFunction,
    });


    /*
    //->CORRESPONSAL RIA

    //STEPF REVERSE PAYMENT ORDER
    const sfReversePaymentOrderCorresponsalRia = sfReversePaymentOrderRia(this, lambdaIntegrator, { roleStepFunction, logGroup, nameSecret: config.SECRET_MANAGER_RIA_CRED });
    //STEPF ONLINE PAYMENT ORDER
    const sfonlinePaymentOrderCorresponsalRia = sfOnlinePaymentOrderRia(this, lambdaIntegrator, { roleStepFunction, logGroup, nameSecret: config.SECRET_MANAGER_RIA_CRED });

    //->CORRESPONSAL INTERMEX
    //PAY ORDER
    const sfPayOrderIntermex = sfOnlinePaymentOrderIntermex(this, tableAuthorizationTokenCorrespondent, lambdaIntegrator, { roleStepFunction, logGroup, nameSecret: config.SECRET_MANAGER_INTERMEX_CRED })
    //REVERSE ORDER 
    const sfreverseOrderIntermex = sfReverseOrderIntermex(this, lambdaIntegrator, tableAuthorizationTokenCorrespondent, { roleStepFunction, logGroup, nameSecret: config.SECRET_MANAGER_INTERMEX_CRED });

    //->CORRESPONSAL TRANSNETWORK
    //PAY ORDER
    const sfonlinePaymentOrderTransnetwork = sfOnlinePaymentTransnetwork(this, lambdaIntegrator, { roleStepFunction, logGroup, nameSecret: config.SECRET_MANAGER_TRANSNETWORK_CRED });
    //REVERSE ORDER
    const sfonlineReversePaymentOrderTransnetwork = sfOnlineReversePaymentTransnetwork(this, lambdaIntegrator, { roleStepFunction, logGroup, nameSecret: config.SECRET_MANAGER_TRANSNETWORK_CRED });




    //Rules for EventBridge
    //RIA
    reversePaymentOrderRiaRule(this, eventBus, sfReversePaymentOrderCorresponsalRia.stateMachineArn);
    serviceNotifyRiaRule(this, eventBus, sfServiceNotifyCorresponsalRia.stateMachineArn);
    onlinePaymentOrderRiaRule(this, eventBus, sfonlinePaymentOrderCorresponsalRia.stateMachineArn);
    
    // INTERMEX
    RequestOrderCodeAndNameINTERMEXRule(this, eventBus, sfconsultOrderIntermex.stateMachineArn)
    onlinePaymentOrderIntermexRule(this, eventBus, sfPayOrderIntermex.stateMachineArn)
    reversePaymentOrderIntermexRule(this, eventBus, sfreverseOrderIntermex.stateMachineArn)

    //TRANSNETWORK
    RequestOrderCodeAndNameTransnetworkRule(this, eventBus, sfconsultOnlineOrderTransnetwork.stateMachineArn);
    onlinePaymentOrderTransnetworkRule(this, eventBus, sfonlinePaymentOrderTransnetwork.stateMachineArn);
    reversePaymentOrderTransnetworkRule(this, eventBus, sfonlineReversePaymentOrderTransnetwork.stateMachineArn);

    */


  }
}
