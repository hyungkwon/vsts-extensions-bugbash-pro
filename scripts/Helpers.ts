import { Constants } from "./Models";

import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import {JsonPatchDocument, JsonPatchOperation, Operation} from "VSS/WebApi/Contracts";
import * as WitClient from "TFS/WorkItemTracking/RestClient";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import * as WitBatchClient from "TFS/WorkItemTracking/BatchRestClient";

export function getBugBashCollectionKey(bugBashId: string): string {
    return `BugBashCollection_${bugBashId}`;
}

export function getBugBashItemCollectionKey(bugBashId: string, itemId: string): string {
    return `BugBashItemCollection_${bugBashId}_${itemId}`;
}

export async function saveWorkItems(fieldValuesMap: IDictionaryNumberTo<IDictionaryStringTo<string>>): Promise<WorkItem[]> {
    let batchDocument: [number, JsonPatchDocument][] = [];

    for (const id in fieldValuesMap) {
        let patchDocument: JsonPatchDocument & JsonPatchOperation[] = [];
        for (let fieldRefName in fieldValuesMap[id]) {
            patchDocument.push({
                op: Operation.Add,
                path: `/fields/${fieldRefName}`,
                value: fieldValuesMap[id][fieldRefName]
            } as JsonPatchOperation);
        }

        batchDocument.push([parseInt(id), patchDocument]);
    }

    let response = await WitBatchClient.getClient().updateWorkItemsBatch(batchDocument);
    return response.value.map((v: WitBatchClient.JsonHttpResponse) => JSON.parse(v.body) as WorkItem);
}

export async function saveWorkItem(id: number, fieldValues: IDictionaryStringTo<string>): Promise<WorkItem> {
    let patchDocument: JsonPatchDocument & JsonPatchOperation[] = [];
    for (let fieldRefName in fieldValues) {
        patchDocument.push({
            op: Operation.Add,
            path: `/fields/${fieldRefName}`,
            value: fieldValues[fieldRefName]
        } as JsonPatchOperation);
    }

    return await WitClient.getClient().updateWorkItem(patchDocument, id);
}

export async function createWorkItem(workItemType: string, fieldValues: IDictionaryStringTo<string>): Promise<WorkItem> {
    let patchDocument: JsonPatchDocument & JsonPatchOperation[] = [];
    for (let fieldRefName in fieldValues) {
        patchDocument.push({
            op: Operation.Add,
            path: `/fields/${fieldRefName}`,
            value: fieldValues[fieldRefName]
        } as JsonPatchOperation);
    }

    return await WitClient.getClient().createWorkItem(patchDocument, VSS.getWebContext().project.id, workItemType);
}

export function isWorkItemAccepted(workItem: WorkItem): boolean {
    let tags: string = workItem.fields["System.Tags"] || "";
    let tagArr = tags.split(";");

    if (Utils_Array.findIndex(tagArr, (t: string) => Utils_String.equals(t.trim(), Constants.BUGBASH_ACCEPT_TAG, true)) !== -1) {
        return true;
    }

    return false;
}

export function isWorkItemRejected(workItem: WorkItem): boolean {
    let tags: string = workItem.fields["System.Tags"] || "";
    let tagArr = tags.split(";");

    if (Utils_Array.findIndex(tagArr, (t: string) => Utils_String.equals(t.trim(), Constants.BUGBASH_REJECT_TAG, true)) !== -1) {
        return true;
    }

    return false;
}

export function getBugBashTag(bugbashId: string): string {
    return `BugBash_${bugbashId}`;
}

export function isInteger(value: string): boolean {
    return /^\d+$/.test(value);
}

export function parseTags(tags: string): string[] {
    if (tags && tags.trim()) {
        let tagsArr = (tags || "").split(";");
        return tagsArr.map((t: string) => t.trim());
    }
    return [];
}

export async function removeFromBugBash(bugBashId: string, workItems: WorkItem[]): Promise<void> {
    let updates: [number, JsonPatchDocument][] = [];

    for (const workItem of workItems){
        let tagArr: string[] = parseTags(workItem.fields["System.Tags"]);
        tagArr = Utils_Array.subtract(tagArr, [getBugBashTag(bugBashId), Constants.BUGBASH_ACCEPT_TAG, Constants.BUGBASH_REJECT_TAG], Utils_String.ignoreCaseComparer);
        
        let patchDocument: JsonPatchDocument & JsonPatchOperation[] = [{
                op: Operation.Add,
                path: `/fields/System.Tags`,
                value: tagArr.join(";")
            } as JsonPatchOperation];

        updates.push([workItem.id, patchDocument]);
    }

    await WitBatchClient.getClient().updateWorkItemsBatch(updates);
}