import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { ConnectProvider, ConnectInstance, ConnectInstanceProps } from '@ttec-dig-vf/cdk-resources';

type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export interface ConnectStackProps extends StackProps, AtLeast<ConnectInstanceProps, 'instanceAlias'> {
  prefix: string;
  env: {
    account: string;
    region: string;
  };
}

export class ConnectStack extends Stack {
  constructor(scope: Construct, id: string, props: ConnectStackProps) {
    super(scope, id, props);

    const connectProvider = new ConnectProvider(this, 'ConnectProvider', {
      env: props.env,
      prefix: props.prefix
    });

    const instance = new ConnectInstance(this, 'ConnectInstance', {
      ...props,
      instanceAlias: props.instanceAlias,
      identityManagementType: props.identityManagementType ?? 'CONNECT_MANAGED',
      inboundCallsEnabled: props.inboundCallsEnabled ?? true,
      outboundCallsEnabled: props.outboundCallsEnabled ?? true,
      connectProvider
    });
    instance.node.addDependency(connectProvider);
  }
}
