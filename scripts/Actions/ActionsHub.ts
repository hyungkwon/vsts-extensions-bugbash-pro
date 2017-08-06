import { Action } from "VSS/Flux/Action";

import { UserSettings, BugBashSettings, IBugBash, IBugBashItemComment, IBugBashItem } from "../Interfaces";

export module SettingsActionsHub {
    export var InitializeBugBashSettings = new Action<BugBashSettings>();
    export var UpdateBugBashSettings = new Action<BugBashSettings>();
}

export module BugBashActionsHub {
    export var InitializeAllBugBashes = new Action<IBugBash[]>();
    export var InitializeBugBash = new Action<IBugBash>();
    export var RefreshBugBash = new Action<IBugBash>();
    export var RefreshAllBugBashes = new Action<IBugBash[]>();
    export var UpdateBugBash = new Action<IBugBash>();
    export var DeleteBugBash = new Action<string>();
    export var CreateBugBash = new Action<IBugBash>();
}

export module BugBashItemCommentActionsHub {
    export var InitializeComments = new Action<{bugBashItemId: string, comments: IBugBashItemComment[]}>();
    export var RefreshComments = new Action<{bugBashItemId: string, comments: IBugBashItemComment[]}>();
    export var CreateComment = new Action<{bugBashItemId: string, comment: IBugBashItemComment}>();
    export var ClearComments = new Action<void>();
}

export module BugBashItemActionsHub {
    export var InitializeBugBashItems = new Action<{bugBashId: string, bugBashItems: IBugBashItem[]}>();
    export var RefreshBugBashItems = new Action<{bugBashId: string, bugBashItems: IBugBashItem[]}>();
    export var RefreshBugBashItem = new Action<{bugBashId: string, bugBashItem: IBugBashItem}>();
    export var CreateBugBashItem = new Action<{bugBashId: string, bugBashItem: IBugBashItem}>();
    export var UpdateBugBashItem = new Action<{bugBashId: string, bugBashItem: IBugBashItem}>();
    export var DeleteBugBashItem = new Action<{bugBashId: string, bugBashItemId: string}>();
    export var AcceptBugBashItem = new Action<{bugBashId: string, bugBashItem: IBugBashItem}>();
}

export module BugBashErrorMessageActionsHub {
    export var PushErrorMessage = new Action<string>();
    export var DismissErrorMessage = new Action<void>();
}