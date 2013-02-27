({
	/**
     * Verify AuraStorageService.selectAdapter(persistent, secure) combinations
     */

	testSelectNotPersistentAndNotSecure: {
        test: function(cmp){
            $A.test.assertEquals("memory", $A.storageService.selectAdapter(false, false));
        }
    },

	testSelectPersistentAndNotSecure: {
        test: function(cmp){
            $A.test.assertEquals("smartstore", $A.storageService.selectAdapter(true, false));
        }
    },
	
    testSelectNotPersistentAndSecure: {
        test: function(cmp){
            $A.test.assertEquals("memory", $A.storageService.selectAdapter(false, true));
        }
    },

    testSelectPersistentAndSecure: {
        test: function(cmp){
            $A.test.assertEquals("smartstore", $A.storageService.selectAdapter(true, true));
        }
    }
})