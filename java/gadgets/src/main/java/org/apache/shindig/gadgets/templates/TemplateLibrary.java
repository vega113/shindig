/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.shindig.gadgets.templates;

import org.apache.shindig.common.uri.Uri;
import org.apache.shindig.common.xml.DomUtil;
import org.apache.shindig.gadgets.GadgetException;
import org.w3c.dom.Attr;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.util.Set;

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.ImmutableSet.Builder;

/**
 * An Object representing a Library of Template-based custom OSML tags.
 * TODO: support embedded style and script per tag 
 */
public class TemplateLibrary {

  public static final String TAG_ATTRIBUTE = "tag";
  public static final String NAMESPACE_TAG = "Namespace";
  public static final String TEMPLATE_TAG = "Template";
  public static final String STYLE_TAG = "Style";
  public static final String JAVASCRIPT_TAG = "JavaScript";
  public static final String TEMPLATEDEF_TAG = "TemplateDef";
  
  private final Uri libraryUri;
  private TagRegistry registry;
  private String nsPrefix;
  private String nsUri;
  private String style;
  private String javaScript;
  
  public TemplateLibrary(Uri uri, Element root) throws GadgetException, TemplateParserException {
    libraryUri = uri;
    registry = new DefaultTagRegistry(parseLibraryDocument(root));
  }
  
  /**
   * @return a registry of tags.
   */
  public TagRegistry getTagRegistry() {
    return registry;
  }
  
  /**
   * @return the URI from which the library was loaded.  (This is not the
   * namespace of tags in the library.)
   */
  public Uri getLibraryUri() {
    return libraryUri;
  }
  
  /**
   * @return the concatenated contents of Style elements for the library.
   */
  public String getStyle() {
    return style;
  }
  
  /**
   * @return the concatenated contents of JavaScript elements for the library.
   */
  public String getJavaScript() {
    return javaScript;
  }
  
  private Set<TagHandler> parseLibraryDocument(Element root)
      throws GadgetException, TemplateParserException {
    ImmutableSet.Builder<TagHandler> handlers = ImmutableSet.builder();
    
    NodeList nodes = root.getChildNodes();
    for (int i = 0; i < nodes.getLength(); i++) {
      Node node = nodes.item(i);
      if (!(node instanceof Element)) {
        continue;
      }
      
      Element element = (Element) node;
      if (NAMESPACE_TAG.equals(element.getLocalName())) {
        processNamespace(element);
      } else if (STYLE_TAG.equals(element.getLocalName())) {
        processStyle(element);
      } else if (JAVASCRIPT_TAG.equals(element.getLocalName())) {
        processJavaScript(element);
      } else if (TEMPLATE_TAG.equals(element.getLocalName())) {
        processTemplate(handlers, element);
      } else if (TEMPLATEDEF_TAG.equals(element.getLocalName())) {
        processTemplateDef(handlers, element);
      }
    }
    
    return handlers.build();
  }
  
  private void processTemplateDef(Builder<TagHandler> handlers, Element defElement)
      throws TemplateParserException {
    Attr tagAttribute = defElement.getAttributeNode(TAG_ATTRIBUTE);
    if (tagAttribute == null) {
      throw new TemplateParserException("Missing tag attribute on TemplateDef");
    }

    Element templateElement = (Element) DomUtil.getFirstNamedChildNode(defElement, TEMPLATE_TAG);
    TagHandler handler = createHandler(tagAttribute.getNodeValue(), templateElement);
    if (handler != null) {
      handlers.add(handler);
    }
  }

  private void processTemplate(Builder<TagHandler> handlers, Element templateElement)
      throws TemplateParserException {
    Attr tagAttribute = templateElement.getAttributeNode(TAG_ATTRIBUTE);
    if (tagAttribute == null) {
      throw new TemplateParserException("Missing tag attribute on Template");
    }
    
    TagHandler handler = createHandler(tagAttribute.getNodeValue(), templateElement);
    if (handler != null) {
      handlers.add(handler);
    }
  }

  private void processStyle(Element element) {
    if (style == null) {
      style = element.getTextContent();
    } else {
      style = style + "\n" + element.getTextContent();
    }
  }

  private void processJavaScript(Element element) {
    if (javaScript == null) {
      javaScript = element.getTextContent();
    } else {
      javaScript = javaScript + "\n" + element.getTextContent();
    }
  }

  private void processNamespace(Element namespaceNode) throws TemplateParserException {
    if ((nsPrefix != null) || (nsUri != null)) {
      throw new TemplateParserException("Duplicate Namespace elements");
    }
    
    nsPrefix = namespaceNode.getAttribute("prefix");
    if ("".equals(nsPrefix)) {
      throw new TemplateParserException("Missing prefix attribute on Namespace");
    }
    
    nsUri = namespaceNode.getAttribute("url");
    if ("".equals(nsUri)) {
      throw new TemplateParserException("Missing url attribute on Namespace");
    }
  }

  private TagHandler createHandler(String tagName, Element template)
      throws TemplateParserException {
    String [] nameParts = tagName.split(":");
    // At this time, we only support namespaced tags
    if (nameParts.length != 2) {
      return null;
    }
    String namespaceUri = template.lookupNamespaceURI(nameParts[0]);
    if (!nsPrefix.equals(nameParts[0]) || !nsUri.equals(namespaceUri)) {
      throw new TemplateParserException(
          "Can't create tags in undeclared namespace: " + nameParts[0]);
    }
    return new TemplateBasedTagHandler(template, namespaceUri, nameParts[1]);
  }
}