import {resolve as resolvePath} from "https://deno.land/std/path/posix.ts";
import {ensureDir} from "https://deno.land/std/fs/mod.ts";
import {BossnetApiClient} from "../../BossnetApiClient.mjs";
import {Command, EnumType} from "https://deno.land/x/cliffy/command/mod.ts";
import {loadClientForCLI, loadNetworkAndApiKey} from "../../utils/smallUtilFuncs.mjs";
import {Log} from "../../utils/log.js";
import {outputTerraformAws} from "./terraform_aws.mjs";

function getBoss-netTfVars(networkName, apiKey, extraVars={}) {
    let rtnVal = Object.assign({
        Boss-net_network_name: networkName,
        Boss-net_api_key: apiKey
    }, extraVars);
    return JSON.stringify(rtnVal);
}

function getBoss-netTfModule() {
    const s = `
    variable "Boss-net_network_name" {
      type = string
      sensitive = true
    }
    variable "Boss-net_api_key" {
      type = string
      sensitive = true
    }

    
    module "Boss-net" {
      source = "./Boss-net"
      network_name = var.Boss-net_network_name
      api_key = var.Boss-net_api_key
    }`.replace(/^    /gm, "");
    return s;
}

function getBoss-netTfProvider() {
    const s = `
    terraform {
      required_providers {
        Boss-net = {
          source = "Boss-net/Boss-net"
          version = ">= 0.1.8"
        }
      }
    }
    
    variable "network_name" {
      type = string
      sensitive = true
    }
    variable "api_key" {
      type = string
      sensitive = true
    }
    
    provider "Boss-net" {
      api_token = var.api_key
      network   = var.network_name
    }`.replace(/^    /gm, "");

    return s;
}

async function generateBoss-netTerraform(client, options) {

    const configForTerraform = {
        typesToFetch: ["RemoteNetwork", "Connector", "Group"],
        fieldSet: [BossnetApiClient.FieldSet.ID, BossnetApiClient.FieldSet.LABEL,
                   BossnetApiClient.FieldSet.NODES],
        recordTransformOpts: {
            mapNodeToId: true
        }
    }
    const allNodes = await client.fetchAll(configForTerraform);
    // Boss-net Resources needs to be fetched differently
    configForTerraform.fieldSet = [BossnetApiClient.FieldSet.ALL];
    allNodes.Resource = (await client.fetchAllResources(configForTerraform));

    const tfImports = [];
    let idMap = {};
    const tfIdMapper = (n) => {
        n.tfId = n.name.replace(/[\s+\.+]/g, "-");
        if ( n.tfId.match(/^[0-9].*/) ) {
            n.tfId = `_${n.tfId}`;
        }
        idMap[n.id] = n.tfId
    }
    allNodes.RemoteNetwork.forEach(tfIdMapper);
    allNodes.RemoteNetwork.forEach(n => tfImports.push(`terraform import module.Boss-net.Boss-net_remote_network.${n.tfId} ${n.id}`));

    allNodes.Connector.forEach(tfIdMapper);
    allNodes.Connector.forEach(n => tfImports.push(`terraform import module.Boss-net.Boss-net_connector.${n.tfId} ${n.id}`));
    allNodes.Group.forEach(tfIdMapper);
    allNodes.Group.forEach(n => tfImports.push(`terraform import module.Boss-net.Boss-net_group.${n.tfId} ${n.id}`));

    allNodes.Resource.forEach(tfIdMapper);
    allNodes.Resource.forEach(n => tfImports.push(`terraform import module.Boss-net.Boss-net_resource.${n.tfId} ${n.id}`));

    const remoteNetworksTf = "\n#\n# Boss-net Remote Networks\n#\n" + allNodes.RemoteNetwork.map(n => `
        resource "Boss-net_remote_network" "${n.tfId}" { # Id: ${n.id}
          name = "${n.name}"
        }
        output "network-${n.tfId}" {
          value = Boss-net_remote_network.${n.tfId}
        }
        
        `.replace(/^        /gm, "")).join("\n");

    const connectorsTf = "\n#\n# Boss-net Connectors\n#\n" + allNodes.Connector.map(n => `
        resource "Boss-net_connector" "${n.tfId}" { # Id: ${n.id}
          name = "${n.name}"
          remote_network_id = Boss-net_remote_network.${idMap[n.remoteNetworkId]}.id
        }
        output "connector-${n.tfId}" {
          value = Boss-net_connector.${n.tfId}
        }
        `.replace(/^        /gm, "")).join("\n");

    const groupsTf = "\n#\n# Boss-net Groups\n#\n" + allNodes.Group.map(n => `
        resource "Boss-net_group" "${n.tfId}" { # Id: ${n.id}
          name = "${n.name}"
        }
        output "group-${n.tfId}" {
          value = Boss-net_group.${n.tfId}
        }
        `.replace(/^        /gm, "")).join("\n");

    const resourcesTf = "\n#\n# Boss-net Resources\n#\n" + allNodes.Resource.map(n => `
        resource "Boss-net_resource" "${n.tfId}" { # Id: ${n.id}
          name = "${n.name}"
          address = "${n.address.value}"
          remote_network_id = Boss-net_remote_network.${idMap[n.remoteNetworkId]}.id
          group_ids = [${n.groups.map(groupId => `Boss-net_group.${idMap[groupId]}.id`).join(", ")}]
          protocols {
            allow_icmp = ${n.protocols.allowIcmp}
            tcp {
                policy = "${n.protocols.tcp.policy}"
                ports = [${n.protocols.tcp.ports.map(port => port.start === port.end ? `"${port.start}"` : `"${port.start}-${port.end}"`).join(", ")}]
            }
            udp {
                policy = "${n.protocols.udp.policy}"
                ports = [${n.protocols.udp.ports.map(port => port.start === port.end ? `"${port.start}"` : `"${port.start}-${port.end}"`).join(", ")}]
            }
          }
        }
        output "resource-${n.tfId}" {
          value = Boss-net_resource.${n.tfId}
        }
        `.replace(/^        /gm, "")).join("\n");


    const tfContent = `${remoteNetworksTf}\n\n${connectorsTf}\n\n${groupsTf}\n\n${resourcesTf}`;
    return {tfContent, tfImports};
}


export const deployTerraformCommand = new Command()
    .description("Deploy Boss-net via Terraform")
    .type("targetCloud", new EnumType(["none", "aws"]))
    .option("-t, --target-cloud [value:targetCloud]", "Target cloud", {default: "none"})
    .option("-o, --output-directory [value:string]", "Output directory")
    .option("-i, --initialize [boolean]", "Initialize Terraform")
    .option("-s, --silent [boolean]", "Try to remain silent (not prompt for inputs)")
    .action(async (options) => {
        const outputDir = resolvePath(options.outputDirectory || "terraform");
        await ensureDir(outputDir);
        let moduleDir = `${outputDir}/Boss-net`;
        await ensureDir(moduleDir);

        const {networkName, apiKey, client} = await loadClientForCLI(options);
        options.apiKey = apiKey;
        options.accountName = networkName;
        const {tfContent, tfImports} = await generateBoss-netTerraform(client, options);

        await Deno.writeTextFile(`${outputDir}/Boss-net-module.tf`, getBoss-netTfModule());
        await Deno.writeTextFile(`${outputDir}/Boss-net.auto.tfvars.json`, getBoss-netTfVars(networkName, apiKey));
        await Deno.writeTextFile(`${moduleDir}/Boss-net-provider.tf`, getBoss-netTfProvider());
        await Deno.writeTextFile(`${moduleDir}/Boss-net.tf`, tfContent);

        if ( Deno.build.os === "windows") {
            await Deno.writeTextFile(`${outputDir}/import-Boss-net.bat`, tfImports.join("\r\n"));
        }
        else {
            await Deno.writeTextFile(`${outputDir}/import-Boss-net.sh`, "#!/bin/sh\n"+tfImports.join("\n"), {mode: 0o755});
        }

        if ( options.targetCloud === "aws") {
            await outputTerraformAws(outputDir, client, options)
        }
        Log.warn(`Note: Your Boss-net API key has been written into '${outputDir}/Boss-net.auto.tfvars.json', please take care to keep it secure`);
        Log.success(`Deploy to '${outputDir}' completed.`);
    });