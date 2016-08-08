function COQL() {
    return {
        queries: {
            component: function() {
                // [{descriptor: "markup://aura:expression"}]
                return $A.getQueryStatement()
                    .field("descriptor", function(resultSet){return resultSet.getDef().getDescriptor().toString();})
                    .from('component')
                    .query();
            },

            afterRender: function() {
                // [{"startTime":1399675188180,"endTime":1399675188181,"descriptor":"markup://aura:text {0:c}"}]
                return $A.getQueryStatement()
                    .field("descriptor",function(resultSet){return resultSet.component.toString();})
                    .fields("startTime,endTime,type")
                    .from("renderings")
                    .where("type=='afterRender'")
                    .query();
            },

            render: function() {
                // [{"startTime":1399675188180,"endTime":1399675188181,"descriptor":"markup://aura:text {0:c}"}]
                return $A.getQueryStatement()
                    .field("descriptor",function(resultSet){return resultSet.component.toString();})
                    .fields("startTime,endTime,type")
                    .from("renderings")
                    .where("type=='render'")
                    .query();
            },

            rerender: function() {
                // [{"startTime":1399675188180,"endTime":1399675188181,"descriptor":"markup://aura:text {0:c}"}]
                return $A.getQueryStatement()
                    .field("descriptor",function(resultSet){return resultSet.component.toString();})
                    .fields("startTime,endTime,type")
                    .from("renderings")
                    .where("type=='rerender'")
                    .query();
            },

            unrender: function() {
                // [{"startTime":1399675188180,"endTime":1399675188181,"descriptor":"markup://aura:text {0:c}"}]
                return $A.getQueryStatement()
                    .field("descriptor",function(resultSet){return resultSet.component.toString();})
                    .fields("startTime,endTime,type")
                    .from("renderings")
                    .where("type=='unrender'")
                    .query();
            }
        },
        enabled: $A.getContext().getMode() === 'STATS',
        snapshots: {},

        clearSnapshots: function () {
            this.snapshots = {};
        },

        snapshot: function (name) {
            $A.assert(name, "COQL snapshot name can't be empty");
            if (this.enabled) {
                var resultSets = {};
                for (var view in this.queries) {
                    resultSets[view] = this.queries[view]();
                }

                this.snapshots[name] = resultSets;
            }
        },

        diff: function (endSnapshot, startSnaphost) {
            var end     = this.snapshots[endSnapshot],
                start   = this.snapshots[startSnaphost],
                results = {};

            $A.assert(start && end, 'Cannot find the snapshots to diff against');

            for (var view in end) {
                results[view] = end[view].diff(start[view]);
            }
            return results;
        },
        getResults: function (endSnapshot, startSnaphost) {
            var diff    = this.diff(endSnapshot, startSnaphost),
                results = {};

            for (var key in diff) {
                results[key] = {
                    added   : diff[key].added.rowCount,
                    removed : diff[key].removed.rowCount
                };
            }
            return results;
        }
    }
}