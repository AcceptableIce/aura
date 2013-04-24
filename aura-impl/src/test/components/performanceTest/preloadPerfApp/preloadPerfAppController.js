({
	pushComponent:function(cmp){
		var a = $A.get("c.aura://ComponentController.getApplication");
		a.setParams({
            "name" : 'performanceTest:perfApp',
            "attributes" : {'start': 5 }
        });
		a.setCallback(cmp,function(a){
			var c = $A.newCmp(a.getReturnValue());
			cmp.find('placeHolder').getValue('v.body').push(c);
			$A.measure("Fetch Component whose definition was preloaded", "Fetch preloaded component");
		});
		$A.mark("Fetch preloaded component");
		a.runAfter(a);
	}
})