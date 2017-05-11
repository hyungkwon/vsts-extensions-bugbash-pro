import "../../css/ResultsView.scss";

import * as React from "react";

import { HostNavigationService } from "VSS/SDK/Services/Navigation";
import * as WitClient from "TFS/WorkItemTracking/RestClient";
import { Wiql, WorkItem } from "TFS/WorkItemTracking/Contracts";
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Label } from "OfficeFabric/Label";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.Props";
import { autobind } from "OfficeFabric/Utilities";

import { BaseComponent, IBaseComponentProps, IBaseComponentState } from "VSTS_Extension/Components/Common/BaseComponent";
import { BaseStore } from "VSTS_Extension/Stores/BaseStore";
import { WorkItemFieldStore } from "VSTS_Extension/Stores/WorkItemFieldStore";
import { Loading } from "VSTS_Extension/Components/Common/Loading";
import { Grid } from "VSTS_Extension/Components/Grids/Grid";
import { IdentityView } from "VSTS_Extension/Components/WorkItemControls/IdentityView";
import { SortOrder, GridColumn, ICommandBarProps, IContextMenuProps } from "VSTS_Extension/Components/Grids/Grid.Props";

import { IBugBash, UrlActions, IBugBashItemDocument } from "../Models";
import { BugBashItemView } from "./BugBashItemView";
import Helpers = require("../Helpers");
import { BugBashStore } from "../Stores/BugBashStore";
import { BugBashItemStore } from "../Stores/BugBashItemStore";
import { StoresHub } from "../Stores/StoresHub";

interface IViewHubViewState extends IBaseComponentState {
    bugBashItem?: IBugBash;
    items?: IBugBashItemDocument[];
    selectedBugBashItem?: IBugBashItemDocument;
    loading?: boolean;
}

interface IViewHubViewProps extends IBaseComponentProps {
    id: string;
}

export class ViewBugBashView extends BaseComponent<IViewHubViewProps, IViewHubViewState> {
    protected getStoresToLoad(): {new (): BaseStore<any, any, any>}[] {
        return [BugBashStore, BugBashItemStore];
    }

    protected initializeState() {
        this.state = {
            bugBashItem: null,
            loading: true,
            items: [],
            selectedBugBashItem: null   
        };
    }

    protected async initialize() {
        StoresHub.bugBashItemStore.refreshItems(this.props.id);
        const found = await StoresHub.bugBashStore.ensureItem(this.props.id);

        if (!found) {
            this.updateState({
                bugBashItem: null,
                loading: false,
                items: [],
                selectedBugBashItem: null
            });
        }
    }   

    protected onStoreChanged() {
        this.updateState({
            bugBashItem: StoresHub.bugBashStore.getItem(this.props.id),
            items: StoresHub.bugBashItemStore.getItems(this.props.id),
            loading: !StoresHub.bugBashStore.isLoaded() || !StoresHub.bugBashItemStore.isDataLoaded(this.props.id)
        });
    }

    public render(): JSX.Element {
        if (this.state.loading) {
            return <Loading />;
        }
        else {
            if (!this.state.bugBashItem) {
                return <MessageBar messageBarType={MessageBarType.error}>This instance of bug bash doesn't exist.</MessageBar>;
            }
            else if(!Utils_String.equals(VSS.getWebContext().project.id, this.state.bugBashItem.projectId, true)) {
                return <MessageBar messageBarType={MessageBarType.error}>This instance of bug bash is out of scope of current project.</MessageBar>;
            }
            else {
                return (
                    <div className="results-view">                        
                        <Grid
                            className="bugbash-item-grid"
                            items={this.state.items}
                            columns={this._getGridColumns()}
                            commandBarProps={{menuItems: this._getCommandBarMenuItems(), farMenuItems: this._getCommandBarFarMenuItems()}}
                            contextMenuProps={{menuItems: this._getContextMenuItems}}
                            onItemInvoked={(item: IBugBashItemDocument) => this.updateState({selectedBugBashItem: item})}
                        />
                        
                        <div className="item-viewer">
                            <BugBashItemView id={this.state.selectedBugBashItem ? this.state.selectedBugBashItem.id : null} bugBashId={this.props.id} />
                        </div>
                    </div>
                );
            }            
        }
    }     

    @autobind
    private _getGridColumns(): GridColumn[] {
        const gridCellClassName = "item-grid-cell";

        return [
            {
                key: "title",
                name: "Title",
                minWidth: 200,
                maxWidth: 800,
                resizable: true,
                onRenderCell: (item: IBugBashItemDocument) => <Label className={gridCellClassName}>{item.title}</Label>,
                sortFunction: (item1: IBugBashItemDocument, item2: IBugBashItemDocument, sortOrder: SortOrder) => {
                    let compareValue = Utils_String.ignoreCaseComparer(item1.title, item2.title)
                    return sortOrder === SortOrder.DESC ? -1 * compareValue : compareValue;
                },
                filterFunction: (item: IBugBashItemDocument, filterText: string) => Utils_String.caseInsensitiveContains(item.title, filterText)
            },
            {
                key: "createdby",
                name: "Created By",
                minWidth: 100,
                maxWidth: 250,
                resizable: true,
                onRenderCell: (item: IBugBashItemDocument) => <IdentityView identityDistinctName={item.createdBy} />,
                sortFunction: (item1: IBugBashItemDocument, item2: IBugBashItemDocument, sortOrder: SortOrder) => {
                    let compareValue = Utils_String.ignoreCaseComparer(item1.createdBy, item2.createdBy)
                    return sortOrder === SortOrder.DESC ? -1 * compareValue : compareValue;
                },
                filterFunction: (item: IBugBashItemDocument, filterText: string) => Utils_String.caseInsensitiveContains(item.createdBy, filterText)
            },
            {
                key: "createddate",
                name: "Created Date",
                minWidth: 80,
                maxWidth: 150,
                resizable: true,
                onRenderCell: (item: IBugBashItemDocument) => <Label className={gridCellClassName}>{Utils_Date.friendly(item.createdDate)}</Label>,
                sortFunction: (item1: IBugBashItemDocument, item2: IBugBashItemDocument, sortOrder: SortOrder) => {
                    let compareValue = Utils_Date.defaultComparer(item1.createdDate, item2.createdDate)
                    return sortOrder === SortOrder.DESC ? -1 * compareValue : compareValue;
                }
            }
        ];
    }

    private _getCommandBarMenuItems(): IContextualMenuItem[] {
        return [
                {
                    key: "edit", name: "Edit", title: "Edit", iconProps: {iconName: "Edit"},
                    onClick: async (event?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem) => {
                        let navigationService: HostNavigationService = await VSS.getService(VSS.ServiceIds.Navigation) as HostNavigationService;
                        navigationService.updateHistoryEntry(UrlActions.ACTION_EDIT, {id: this.props.id});
                    }
                },
                {
                    key: "refresh", name: "Refresh", title: "Refresh list", iconProps: {iconName: "Refresh"},
                    onClick: async (event?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem) => {
                        this._refreshResults();
                    }
                },
                {
                    key: "OpenQuery", name: "Open as query", title: "Open all workitems as a query", iconProps: {iconName: "OpenInNewWindow"}, 
                    disabled: this.state.items.length === 0,
                    onClick: async (event?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem) => {
                        //let url = `${VSS.getWebContext().host.uri}/${VSS.getWebContext().project.id}/_workitems?_a=query&wiql=${encodeURIComponent(this._getWiql().query)}`;
                        //window.open(url, "_blank");
                    }
                },
                {
                    key: "Clear", name: "Clear all items", title: "Clear all items from the bug bash instance", iconProps: {iconName: "RemoveLink"}, 
                    disabled: this.state.items.length === 0,
                    onClick: async (event?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem) => {
                        let dialogService: IHostDialogService = await VSS.getService(VSS.ServiceIds.Dialog) as IHostDialogService;
                        try {
                            await dialogService.openMessageDialog("Are you sure you want to clear all items from this bug bash? This action is irreversible. Any work item associated with a bug bash item will not be deleted.", { useBowtieStyle: true });
                        }
                        catch (e) {
                            // user selected "No"" in dialog
                            return;
                        }
                        StoresHub.bugBashItemStore.clearAllItems(this.props.id);
                    }
                }
            ];
    }

    private _getCommandBarFarMenuItems(): IContextualMenuItem[] {
        return [
                {
                    key: "Home", name: "Home", title: "Return to home view", iconProps: {iconName: "Home"}, 
                    onClick: async (event?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem) => {
                        let navigationService: HostNavigationService = await VSS.getService(VSS.ServiceIds.Navigation) as HostNavigationService;
                        navigationService.updateHistoryEntry(UrlActions.ACTION_ALL, null);
                    }
                }
            ];
    }

    @autobind
    private _getContextMenuItems(selectedItems: IBugBashItemDocument[]): IContextualMenuItem[] {
        return [
            {
                key: "OpenQuery", name: "Open as query", title: "Open selected workitems as a query", iconProps: {iconName: "OpenInNewWindow"}, 
                disabled: selectedItems.length === 0,
                onClick: async (event?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem) => {
                    //let url = `${VSS.getWebContext().host.uri}/${VSS.getWebContext().project.id}/_workitems?_a=query&wiql=${encodeURIComponent(this._getWiql().query)}`;
                    //window.open(url, "_blank");
                }
            },
            {
                key: "Delete", name: "Delete", title: "Delete selected items from the bug bash instance", iconProps: {iconName: "RemoveLink"}, 
                disabled: selectedItems.length === 0,
                onClick: async (event?: React.MouseEvent<HTMLElement>, menuItem?: IContextualMenuItem) => {
                    let dialogService: IHostDialogService = await VSS.getService(VSS.ServiceIds.Dialog) as IHostDialogService;
                    try {
                        await dialogService.openMessageDialog("Are you sure you want to clear selected items from this bug bash? This action is irreversible. Any work item associated with a bug bash item will not be deleted.", { useBowtieStyle: true });
                    }
                    catch (e) {
                        // user selected "No"" in dialog
                        return;
                    }
                    StoresHub.bugBashItemStore.deleteItems(selectedItems);
                }
            }
        ];
    }

    private _refreshResults() {
        StoresHub.bugBashItemStore.refreshItems(this.props.id);
    }
}