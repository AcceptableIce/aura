({
    init: function(cmp, evt, helper) {
        helper.restoreLog(cmp);
    },

    fetchCmp: function(cmp, evt, helper) {
        var load = cmp.get("v.load");
        helper.setStatus(cmp, "Fetching: " + load);
        helper.logDefs(cmp);
        $A.createComponent(load, {}, function (newCmp, status, errorMsg) {
            if (status === "SUCCESS") {
                helper.setStatus(cmp, "Fetched: " + load);
                helper.logDefs(cmp);
            } else {
                helper.setStatus(cmp, "Error: " + errorMsg);
            }
        });
    },

    createComponentFromConfig: function(cmp, evt, helper) {
        var load = cmp.get("v.load");
        helper.setStatus(cmp, "Creating: " + load);
        try {
            var newCmp = $A.componentService.createComponentFromConfig({descriptor: "markup://" + load});
            if (newCmp) {
                helper.setStatus(cmp, "Created: " + load);
            }
        } catch (e) {
            helper.setStatus(cmp, "Error: " + e);
        }
    },

    createComponent: function(cmp, evt, helper) {
        var load = cmp.get("v.load");
        helper.setStatus(cmp, "Creating: " + load);
        try {
            $A.componentService.createComponent(load, {}, function(newCmp) {
                if (newCmp) {
                    helper.setStatus(cmp, "Created: " + load);
                }
            });
        } catch (e) {
            helper.setStatus(cmp, "Error: " + e);
        }
    },

    clearActionAndDefStorage: function(cmp, evt, helper) {
        helper.setStatus(cmp, "Clearing Action and Def Storage");
        helper.clearActionAndDefStorage(cmp)
            .then(function() {
                    helper.setStatus(cmp, "Cleared Action and Def Storage");
            })
            ["catch"](function(e) {
                helper.setStatus(cmp, "Error: " + e);
            })
    },

    clearCachesAndLog: function(cmp, evt, helper) {
        helper.setStatus(cmp, "Clearing Caches and Logs");
        helper.reset(cmp)
            .then(function() {
                helper.setStatus(cmp, "Cleared Caches and Logs");
            })
            ["catch"](function(e) {
                helper.setStatus(cmp, "Error: " + e);
        })
    },

    saveLog: function(cmp, evt, helper) {
        helper.saveLog(cmp);
    },

    verifyDefsRestored: function(cmp, evt, helper) {
        helper.setStatus(cmp, "Verifying Defs Restored");
        var storage = $A.storageService.getStorage("ComponentDefStorage");
        if (!storage) {
            helper.setStatus(cmp, "Defs Not Restored");
            return;
        }
        storage.getAll([], true)
            .then(function(items) {
                if (Object.keys(items).length > 0) {
                    helper.setStatus(cmp, "Verified Defs Restored");
                } else {
                    helper.setStatus(cmp, "Defs Not Restored");
                }
            })
            ["catch"](function(error) {
                helper.setStatus(cmp, "Error: " + error.toString());
            });
    },

    /** Handle auraStorage:modified */
    storageModified: function(cmp, evt, helper) {
        var eventStorageName = evt.getParam("name");
        if (eventStorageName !== "ComponentDefStorage") {
            return;
        }
        helper.logComponentDefStorage(cmp)
    },

    /** Handle aura:initialized */
    initialized: function(cmp, evt, helper) {
        helper.setStatus(cmp, "Aura Initialized");
        helper.logDefs(cmp);
    }
})
