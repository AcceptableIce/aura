({
    /**
     * Verify AuraStorageService.initStorage() with various name related
     * scenarios
     */
    testCreateMultipleUniquelyNamedStores : {
        test : [
            function(cmp) {
                var foo = $A.storageService.initStorage({name: "foo"});
                var bar = $A.storageService.initStorage({name: "bar"});

                foo.put("key1", "value1")
                    .then(function() { return bar.put("key2", "value2"); })
                    .then(function() { return foo.get("key1"); })
                    .then(function(v) { cmp._fooValue1 = v.value; })
                    // Insure that foo and bar are truly isolated stores and do
                    // not contain each other's values
                    .then(function() { return foo.get("key2"); })
                    .then(function(v) { cmp._fooValue2Retrieved = $A.util.isUndefined(v); })
                    .then(function() { return bar.get("key2"); })
                    .then(function(v) { cmp._barValue2 = v.value; })
                    // Insure that foo and bar are truly isolated stores and do
                    // not contain each other's values
                    .then(function() { return bar.get("key1"); })
                    .then(function(v) { cmp._barValue1Retrieved = $A.util.isUndefined(v); })

                $A.test.addWaitFor(true, function() {
                    return !$A.util.isUndefined(cmp._fooValue1)
                        && !$A.util.isUndefined(cmp._barValue2)
                        && cmp._fooValue2Retrieved
                        && cmp._barValue1Retrieved;
                });
            }, function(cmp) {
                $A.test.assertEquals("value1", cmp._fooValue1);
                $A.test.assertEquals("value2", cmp._barValue2);
            }
        ]
    },

    testCreateDuplicateNamedStores : {
        test : function(cmp) {
            var foo = $A.storageService.initStorage({name: "foo"});

            try {
                var foo2 = $A.storageService.initStorage({name: "foo"});
            } catch (e) {
                $A.test.assertEquals("Assertion Failed!: Storage named 'foo' already exists : false", e.message);
            }

            try {
                var foo3 = $A.storageService.initStorage({name: "foo"});
            } catch (e) {
                $A.test.assertEquals("Assertion Failed!: Storage named 'foo' already exists : false", e.message);
            }
        }
    },

    testNamedStorageInTemplate : {
        test : function(cmp) {
            var actions = $A.storageService.getStorage("actions");
            $A.test.assertTruthy(actions, "Failed to register a named storage in template");
            $A.test.assertEquals("memory", actions.getName());
            $A.test.assertEquals(9999, actions.getMaxSize())

            var savings = $A.storageService.getStorage("savings");
            $A.test.assertTruthy(savings, "Failed to register a named storage in template");
            $A.test.assertEquals("memory", savings.getName());
            $A.test.assertEquals(6666, savings.getMaxSize())

            var checking = $A.storageService.getStorage("checking");
            $A.test.assertTruthy(checking, "Failed to register multiple named storage in template");
            $A.test.assertEquals("memory", checking.getName());
            $A.test.assertEquals(7777, checking.getMaxSize())
        }
    },

    /**
     * Test case to verify the behavior of $A.storageService.getStorage()
     */
    testGetStorageApi : {
        test: function(cmp){
            $A.test.assertFalsy($A.storageService.getStorage());
            $A.test.assertFalsy($A.storageService.getStorage(undefined));
            $A.test.assertFalsy($A.storageService.getStorage(null));
            $A.test.assertFalsy($A.storageService.getStorage(""));
            $A.test.assertFalsy($A.storageService.getStorage("fooBar"));
        }
    },

    testGetStoragesApi : {
        test: function (cmp){
            var storages = $A.storageService.getStorages();
            $A.test.assertEquals(3, Object.keys(storages).length, "Wrong number of stores");
            $A.test.assertTruthy(storages["actions"], "actions store not returned");
            $A.test.assertTruthy(storages["savings"], "savings store not returned");
            $A.test.assertTruthy(storages["checking"], "checking store not returned");
        }
    },

    testGetStoragesReturnsCopy : {
        test: function (cmp){
            var storages = $A.storageService.getStorages();
            storages["actions"] = null;

            storages = $A.storageService.getStorages();
            $A.test.assertEquals(3, Object.keys(storages).length, "Wrong number of stores");
            $A.test.assertTruthy(storages["actions"], "getStorage() should not be impacted by modifications to its return value");
        }
    },

    testGetStoragesUpdated : {
        test: function (cmp) {
            $A.storageService.initStorage({name: "imperative"});
            var storages = $A.storageService.getStorages();
            $A.test.assertEquals(4, Object.keys(storages).length, "Storage created with imperative API not returned");
            $A.test.assertTruthy(storages["imperative"], "Storage created with imperative API not returned");
        }
    }
})
