import { Connect } from '@aws-sdk/client-connect';
import { fromIni } from '@aws-sdk/credential-provider-ini';

export async function getConnectInstanceId({
  region,
  profile,
  prefix,
  instanceAlias
}: {
  region: string;
  profile: string;
  prefix: string;
  instanceAlias?: string;
}) {
  const alias = instanceAlias ?? prefix;
  let connect: Connect;
  if (process.env.CICD) {
    connect = new Connect({ region });
  } else {
    connect = new Connect({
      region,
      credentials: fromIni({ profile })
    });
  }

  // eslint-disable-next-line prefer-const
  let NextToken: undefined | string;
  do {
    // eslint-disable-next-line no-await-in-loop
    const { InstanceSummaryList = [], NextToken: newToken } = await connect.listInstances({ NextToken });
    NextToken = newToken;
    for (const { Id, InstanceAlias } of InstanceSummaryList) {
      if (InstanceAlias === alias) {
        return Id;
      }
    }
  } while (NextToken);
}
