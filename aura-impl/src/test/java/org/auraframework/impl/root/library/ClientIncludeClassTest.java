/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.auraframework.impl.root.library;

import java.util.Arrays;

import org.auraframework.def.DefDescriptor;
import org.auraframework.def.IncludeDef;
import org.auraframework.def.IncludeDefRef;
import org.auraframework.def.LibraryDef;
import org.auraframework.impl.def.DefinitionTest;

public class ClientIncludeClassTest extends DefinitionTest<IncludeDef> {

	IncludeDefRefImpl.Builder builder = new IncludeDefRefImpl.Builder();

    public ClientIncludeClassTest(String name) {
        super(name);
    }

    public void testSerializeMinimal() throws Exception {
		String code = "function(){}";
        DefDescriptor<LibraryDef> libDesc = getAuraTestingUtil().createStringSourceDescriptor(null,
        		LibraryDef.class, null);
        DefDescriptor<IncludeDef> includeDesc = getAuraTestingUtil().createStringSourceDescriptor("minimal",
                IncludeDef.class, libDesc);
        addSourceAutoCleanup(includeDesc, code);

        builder.setDescriptor(includeDesc.getDef().getDescriptor());
        IncludeDefRef def = builder.build();

        assertEquals(
                String.format("$A.componentService.addLibraryInclude(\"%s\",[],%s);\n",
                		JavascriptIncludeClass.getClientDescriptor(includeDesc), code), def.getJsCode(false));
    }

    public void testSerializeWithSingleComments() throws Exception {
        String code = "//this doc should be helpful\nfunction(){\n//fix later\nreturn this;}//last word";
        DefDescriptor<LibraryDef> libDesc = getAuraTestingUtil().createStringSourceDescriptor(null,
        		LibraryDef.class, null);
        DefDescriptor<IncludeDef> includeDesc = getAuraTestingUtil().createStringSourceDescriptor("singleComments",
                IncludeDef.class, libDesc);
        addSourceAutoCleanup(includeDesc, code);

        builder.setDescriptor(includeDesc.getDef().getDescriptor());
        IncludeDefRef def = builder.build();

        assertEquals(
                String.format("$A.componentService.addLibraryInclude(\"%s\",[],%s);\n",
                		JavascriptIncludeClass.getClientDescriptor(includeDesc), code), def.getJsCode(false));
    }

    public void testSerializeWithMultiComments() throws Exception {
        String code = "/*this doc should be helpful*/function(){/*fix later*/return this;}/*last word*/";
        DefDescriptor<LibraryDef> libDesc = getAuraTestingUtil().createStringSourceDescriptor(null, LibraryDef.class,
                null);
        DefDescriptor<IncludeDef> includeDesc = getAuraTestingUtil().createStringSourceDescriptor("multiComments",
                IncludeDef.class, libDesc);
        addSourceAutoCleanup(includeDesc, code);

        builder.setDescriptor(includeDesc.getDef().getDescriptor());
        IncludeDefRef def = builder.build();

        assertEquals(
                String.format("$A.componentService.addLibraryInclude(\"%s\",[],%s);\n",
                		JavascriptIncludeClass.getClientDescriptor(includeDesc), code), def.getJsCode(false));
    }

    public void testSerializeWithImport() throws Exception {
    	String code = "function(){}";
        DefDescriptor<LibraryDef> libDesc = getAuraTestingUtil().createStringSourceDescriptor(null, LibraryDef.class,
                null);
        DefDescriptor<IncludeDef> includeDesc = getAuraTestingUtil().createStringSourceDescriptor("hasImport",
                IncludeDef.class, libDesc);
        DefDescriptor<IncludeDef> importDesc = getAuraTestingUtil().createStringSourceDescriptor("firstimport",
                IncludeDef.class, libDesc);
        addSourceAutoCleanup(includeDesc, code);

        builder.setDescriptor(includeDesc.getDef().getDescriptor());
        builder.setImports(Arrays.asList(importDesc));
        IncludeDefRef def = builder.build();

        assertEquals(
                String.format("$A.componentService.addLibraryInclude(\"%s\",[\"%s\"],%s);\n",
                		JavascriptIncludeClass.getClientDescriptor(includeDesc),
                		JavascriptIncludeClass.getClientDescriptor(importDesc), code), def.getJsCode(false));
    }

    public void testSerializeWithExternalImport() throws Exception {
    	String code = "function(){}";
        DefDescriptor<LibraryDef> libDesc = getAuraTestingUtil().createStringSourceDescriptor(null, LibraryDef.class,
                null);
        DefDescriptor<IncludeDef> includeDesc = getAuraTestingUtil().createStringSourceDescriptor("hasImport",
                IncludeDef.class, libDesc);

        DefDescriptor<LibraryDef> extLibDesc = getAuraTestingUtil().createStringSourceDescriptor(null,
                LibraryDef.class, null);
        DefDescriptor<IncludeDef> extIncludeDesc = getAuraTestingUtil().createStringSourceDescriptor("firstimport",
                IncludeDef.class, extLibDesc);

        addSourceAutoCleanup(includeDesc, code);

        builder.setDescriptor(includeDesc.getDef().getDescriptor());
        builder.setImports(Arrays.asList(extIncludeDesc));
        IncludeDefRef def = builder.build();

        assertEquals(
                String.format("$A.componentService.addLibraryInclude(\"%s\",[\"%s\"],%s);\n",
                		JavascriptIncludeClass.getClientDescriptor(includeDesc),
                		JavascriptIncludeClass.getClientDescriptor(extIncludeDesc), code), def.getJsCode(false));
    }

    public void testSerializeWithMultipleImports() throws Exception {
    	String code = "function(){}";
        DefDescriptor<LibraryDef> libDesc = getAuraTestingUtil().createStringSourceDescriptor(null,
        		LibraryDef.class, null);
        DefDescriptor<IncludeDef> import1Desc = getAuraTestingUtil().createStringSourceDescriptor("firstimport",
                IncludeDef.class, libDesc);
        DefDescriptor<IncludeDef> import2Desc = getAuraTestingUtil().createStringSourceDescriptor("secondimport",
                IncludeDef.class, libDesc);

        DefDescriptor<LibraryDef> extLibDesc = getAuraTestingUtil().createStringSourceDescriptor(null,
                LibraryDef.class, null);
        DefDescriptor<IncludeDef> extImportDesc = getAuraTestingUtil().createStringSourceDescriptor("thirdimport",
                IncludeDef.class, extLibDesc);

        addSourceAutoCleanup(import1Desc, code);

        builder.setDescriptor(import1Desc.getDef().getDescriptor());
        builder.setImports(Arrays.asList(import2Desc, extImportDesc));
        IncludeDefRef def = builder.build();

        assertEquals(
                String.format("$A.componentService.addLibraryInclude(\"%s\",[\"%s\", \"%s\"],%s);\n",
                		JavascriptIncludeClass.getClientDescriptor(import1Desc),
                		JavascriptIncludeClass.getClientDescriptor(import2Desc),
				JavascriptIncludeClass.getClientDescriptor(extImportDesc), code), def.getJsCode(false));
    }

    public void testSerializeWithExports() throws Exception {
    	String code = "var myexpt=function(){return 'something'}";
        String export = "myexpt";
        DefDescriptor<LibraryDef> libDesc = getAuraTestingUtil().createStringSourceDescriptor(null, LibraryDef.class,
                null);
        DefDescriptor<IncludeDef> includeDesc = getAuraTestingUtil().createStringSourceDescriptor("hasExports",
                IncludeDef.class, libDesc);
        addSourceAutoCleanup(includeDesc, code);

        builder.setDescriptor(includeDesc.getDef().getDescriptor());
		builder.setExport(export);
        IncludeDefRef def = builder.build();

        assertEquals(
                String.format("$A.componentService.addLibraryInclude(\"%s\",[],function lib(){\n%s;\nreturn %s;\n});\n",
                		JavascriptIncludeClass.getClientDescriptor(includeDesc), code, export), def.getJsCode(false));
    }
}
