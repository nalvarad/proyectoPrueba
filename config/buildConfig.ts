import * as aws from "aws-sdk"
import * as yaml from "js-yaml"

export class BuildConfig {

    private nameStackApplication: string
    private stage: string ;
    private env: any;

    constructor(nameStackApplication?: string, stage?: string) {
        this.nameStackApplication = nameStackApplication ?? process.env.STACK_NAME ?? '';
        this.stage = stage ?? process.env.STAGE ?? 'dev';

        if (!this.nameStackApplication) {
            throw new Error("BuildConfig necesita nameStackApplication y stage definidos.");
        }
    }
    /*
    constructor(nameStackApplication: string, stage: string) {
        this.nameStackApplication = nameStackApplication || process.env.STACK_NAME || '';
        this.stage = stage || process.env.STAGE || 'dev';
    }
    */
    async getConfig(): Promise<any> {
        try {

            const nameEnvironmentSsm = `/${this.nameStackApplication}/${this.stage}`
            console.log(`### Getting config from SSM Parameter store with name: " +  ${nameEnvironmentSsm}`);
            //const ssm = new aws.SSM() //OJO AQUI SE CAMBIO
            const ssm = new aws.SSM({ region: 'us-east-1' });

            let ssmResponse: any = await ssm.getParameter({
                Name: nameEnvironmentSsm
            }).promise()

            console.log("### ssmResponse.Parameter.value", ssmResponse)
            let unparsedEnv: any = yaml.load(ssmResponse.Parameter.Value);
            console.log("### unparsedEnv", unparsedEnv)

            const buildConfigResponse: any = {
                STAGE: this.stage,
                VPC_ID: this.ensureString(unparsedEnv, "VPC_ID"),
                SUBNET_1a: this.ensureString(unparsedEnv, "SUBNET_1a"),
                SUBNET_1b: this.ensureString(unparsedEnv, "SUBNET_1b"),
                SUBNET_1c: this.ensureString(unparsedEnv, "SUBNET_1c"),
                SECURITY_GROUP_DEFAULT: this.ensureString(unparsedEnv, "SECURITY_GROUP_DEFAULT"),
                OCP_REQUEST_ONLINE_ORDER_CORE: this.ensureString(unparsedEnv, "OCP_REQUEST_ONLINE_ORDER_CORE"),
                OCP_VALIDATE_STATUS_ONLINE_ORDER: this.ensureString(unparsedEnv, "OCP_VALIDATE_STATUS_ONLINE_ORDER"),
                OCP_PAY_ONLINE_ORDER: this.ensureString(unparsedEnv, "OCP_PAY_ONLINE_ORDER"),
                OCP_CANCEL_ONLINE_PAYMENT_ORDER: this.ensureString(unparsedEnv, "OCP_CANCEL_ONLINE_PAYMENT_ORDER"),
                OCP_REVERT_ONLINE_PAYMENT_ORDER: this.ensureString(unparsedEnv, "OCP_REVERT_ONLINE_PAYMENT_ORDER"),
                OCP_VALIDATE_BRIDGER_POLICIES: this.ensureString(unparsedEnv, "OCP_VALIDATE_BRIDGER_POLICIES"),
                OCP_REVERSE_PAYMENT_ERROR: this.ensureString(unparsedEnv, "OCP_REVERSE_PAYMENT_ERROR"),
                OCP_CREATE_GIRE_PAYMENT: this.ensureString(unparsedEnv, "OCP_CREATE_GIRE_PAYMENT"),
                EVENT_BUS_ARN: this.ensureString(unparsedEnv, "EVENT_BUS_ARN"),
                ACCOUNT_ID: this.ensureString(unparsedEnv, "ACCOUNT_ID"),
                USUARIO_BRIDGER: this.ensureString(unparsedEnv, "USUARIO_BRIDGER"),
                EMAIL_BRIDGER: this.ensureString(unparsedEnv, "EMAIL_BRIDGER"),
                FIRST_LIST_BRIDGER: this.ensureString(unparsedEnv, "FIRST_LIST_BRIDGER"),
                SECOND_LIST_BRIDGER: this.ensureString(unparsedEnv, "SECOND_LIST_BRIDGER"),
                SNS_ARN: this.ensureString(unparsedEnv, "SNS_ARN"),
                TABLE_ONLINE_PAYMENTS: this.ensureString(unparsedEnv, "TABLE_ONLINE_PAYMENTS"),
                SECRET_MANAGER_RIA_CRED: this.ensureString(unparsedEnv, "SECRET_MANAGER_RIA_CRED"),
                SECRET_MANAGER_INTERMEX_CRED: this.ensureString(unparsedEnv, "SECRET_MANAGER_INTERMEX_CRED"),
                SECRET_MANAGER_TRANSNETWORK_CRED: this.ensureString(unparsedEnv, "SECRET_MANAGER_TRANSNETWORK_CRED"),
                TIME_CACHE_RECORD: this.ensureNumber(unparsedEnv, "TIME_CACHE_RECORD"),
                NOTIFICATION_TOPIC_ARN: this.ensureString(unparsedEnv, "NOTIFICATION_TOPIC_ARN"),
                URL_API_PRUEBA: this.ensureString(unparsedEnv, "URL_API_PRUEBA"),
                TIME_EXPIRATION_CACHE: this.ensureString(unparsedEnv, "TIME_EXPIRATION_CACHE"),
                TIME_REINTENTOS: this.ensureString(unparsedEnv, "TIME_REINTENTOS"),
                NUM_REINTENTOS: this.ensureString(unparsedEnv, "NUM_REINTENTOS"),
                SM_ARN: this.ensureString(unparsedEnv, "SM_ARN"),

            }
            console.log(`### buildConfig OK ${buildConfigResponse}`);
            return buildConfigResponse
        } catch (error) {
            console.log("error getConfig", error)
            console.log(`### I cant retrive the SSM Parameter from AWS`)
        }
    }

    ensureString(object: { [name: string]: any }, propName: string): string {
        if (!object[propName] || object[propName].trim().length === 0)
            throw new Error(propName + " does not exist or is empty");

        return object[propName];
    }

    ensureNumber(object: { [name: string]: any }, propName: string): number {
        if (!object[propName])
            throw new Error(propName + " does not exist or is empty");

        return object[propName];
    }



}